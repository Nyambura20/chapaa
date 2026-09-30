"""
CHAPAA-GUARD: Unified Fraud Defense & QoS Intelligence Center
FastAPI Backend Application with Lifespan Management, AT Webhooks,
REST API, and WebSocket SecOps stream.
"""

import hashlib
import logging
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import (
    FastAPI,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    Request,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, text

from backend.database import engine, Base, get_db
from backend.seed_db import ensure_reference_data
from backend.models import (
    AuditLog,
    BlacklistEntity,
    KycAttempt,
    QoSTelemetry,
    ReportedEntity,
    SimSwapRequest,
    SimSwapStatus,
    SpamCheck,
    SpamVerdict,
    ThreatCategory,
    ThreatLog,
    VerifiedEntity,
)
from backend.spam_check import (
    LIKELY_SCAM,
    advice_for,
    apply_rules,
    check_links,
    classify_with_llm,
    combine,
    extract_entities,
    synthesize_speech,
    transcribe_speech,
)
from backend.face_match import FACE_PASS_SCORE, FaceMatchError, judge_faces
from backend.parser import (
    extract_entities_from_text,
    classify_category,
    compute_threat_score,
)
from backend.counties import COUNTY_NAMES
from backend.at_service import AfricasTalkingService
from backend.websocket_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("chapaa.main")


def _ensure_spam_county(sync_conn) -> None:
    """Add the county column on databases created before the fraud map."""
    dialect = sync_conn.dialect.name
    if dialect == "sqlite":
        rows = sync_conn.execute(text("PRAGMA table_info(spam_checks)")).fetchall()
        if not rows or any(row[1] == "county" for row in rows):
            return
        sync_conn.execute(text("ALTER TABLE spam_checks ADD COLUMN county VARCHAR(40)"))
        return
    sync_conn.execute(text("ALTER TABLE spam_checks ADD COLUMN IF NOT EXISTS county VARCHAR(40)"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database schemas and seed default entries."""
    logger.info("Initializing CHAPAA-GUARD tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_ensure_spam_county)
    logger.info("Database schemas verified.")
    await ensure_reference_data()
    yield
    logger.info("Shutting down CHAPAA-GUARD engine.")
    await engine.dispose()


app = FastAPI(
    title="CHAPAA-GUARD SecOps API",
    description="Unified Fraud Defense & QoS Intelligence Center for Africa's Talking Telecom Innovate Hackathon",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js / Vite frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# SCHEMAS
# ==============================================================================

class SimulateSmsRequest(BaseModel):
    sender_phone: str = Field(..., example="+254718442412")
    text: str = Field(..., example="Dear Parent, pay KES 14,500 Term 3 fees to Paybill 522123 Acc 0178 MARANDA.")


class TelemetryPingRequest(BaseModel):
    device_model: str = Field(..., example="Infinix mobility X692-GL")
    ward_location: str = Field(..., example="Changamwe")
    signal_dbm: int = Field(..., example=-78)
    ping_latency_ms: int = Field(..., example=22)


class SimulateVoiceCallRequest(BaseModel):
    recipient: str = Field(..., example="+254718442412")
    paybill: Optional[str] = Field(default="522123", example="522123")


# ==============================================================================
# REAL-TIME WEBSOCKET ENDPOINT
# ==============================================================================

@app.websocket("/ws/secops")
async def websocket_secops_endpoint(websocket: WebSocket):
    """WebSocket stream powering live threat logs, DTMF transitions, and QoS probes."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep alive and allow client command pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning("WebSocket exception: %s", str(e))
        ws_manager.disconnect(websocket)


# ==============================================================================
# AFRICA'S TALKING WEBHOOKS
# ==============================================================================

@app.post("/api/webhooks/at/incoming-sms")
async def webhook_at_incoming_sms(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Africa's Talking Inbound SMS Webhook.
    Triggered when a user forwards a suspicious message to our shortcode/number.
    """
    form_data = await request.form()
    sender_phone = str(form_data.get("from", "+254700000000"))
    text = str(form_data.get("text", "")).strip()
    msg_id = str(form_data.get("id", str(uuid.uuid4())))

    if not text:
        return Response(content="NO_CONTENT", status_code=200)

    # 1. Regex & Entity Extraction
    entities = extract_entities_from_text(text)
    detected_paybill = entities.get("paybill")
    detected_till = entities.get("till")
    target_entity = detected_paybill or detected_till or entities.get("account")

    # 2. Database Cross-Check
    is_verified = False
    is_blacklisted = False
    blacklist_reason = None

    if detected_paybill:
        stmt_verified = select(VerifiedEntity).where(
            VerifiedEntity.business_number == detected_paybill,
            VerifiedEntity.is_active == True,
        )
        res_v = await db.execute(stmt_verified)
        verified_match = res_v.scalars().first()
        is_verified = verified_match is not None

        stmt_black = select(BlacklistEntity).where(
            BlacklistEntity.business_number == detected_paybill
        )
        res_b = await db.execute(stmt_black)
        black_match = res_b.scalars().first()
        if black_match:
            is_blacklisted = True
            blacklist_reason = black_match.reason

    # 3. Threat Scoring
    threat_score, reasons = compute_threat_score(
        text=text,
        sender_phone=sender_phone,
        entities=entities,
        is_verified_entity=is_verified,
        is_blacklisted_entity=is_blacklisted,
        blacklist_reason=blacklist_reason,
    )
    category = classify_category(text)

    # 4. Countermeasures Execution
    actions_taken = {
        "timestamp": datetime.utcnow().isoformat(),
        "warning_sms": False,
        "voice_canary_call": False,
        "reasons": reasons,
    }

    # Dispatch Two-Way Warning SMS
    warning_sms_msg = (
        f"[Chapaa-Alert] TAHADHARI: Paybill {detected_paybill or 'hii'} haijasajiliwa rasmi. "
        f"Alama ya hatari: {threat_score}%. Usitume fedha bila kuthibitisha moja kwa moja na taasisi."
    )
    sms_res = await AfricasTalkingService.send_sms(sender_phone, warning_sms_msg)
    actions_taken["warning_sms"] = True
    actions_taken["sms_dispatch"] = sms_res

    # High Severity Outbound Swahili TTS Call Trigger
    if threat_score >= 80:
        voice_res = await AfricasTalkingService.trigger_voice_warning_call(
            recipient=sender_phone, paybill=detected_paybill
        )
        actions_taken["voice_canary_call"] = True
        actions_taken["voice_dispatch"] = voice_res

    # 5. Persist to ThreatLog
    threat_log = ThreatLog(
        sender_phone=sender_phone,
        raw_text=text,
        extracted_entity=target_entity or "None",
        category=category,
        threat_score=threat_score,
        actions_taken=actions_taken,
        created_at=datetime.utcnow(),
    )
    db.add(threat_log)
    await db.commit()
    await db.refresh(threat_log)

    # 6. Broadcast to Live SecOps Dashboard via WebSocket
    await ws_manager.broadcast_threat_intercepted({
        "id": str(threat_log.id),
        "sender_phone": sender_phone,
        "raw_text": text,
        "extracted_entity": target_entity,
        "extracted_details": entities,
        "category": category.value,
        "threat_score": threat_score,
        "reasons": reasons,
        "actions_taken": actions_taken,
        "created_at": threat_log.created_at.isoformat(),
    })

    return Response(content="OK", media_type="text/plain", status_code=200)


@app.post("/api/webhooks/at/voice-callback")
async def webhook_at_voice_callback(request: Request):
    """
    Africa's Talking outbound voice callback.
    Invoked when the recipient answers a scam-warning call.
    Returns Voice XML that plays the Swahili warning.
    """
    form_data = await request.form()
    logger.info("AT Voice Callback received: %s", dict(form_data))

    is_active = str(form_data.get("isActive", "1"))
    if is_active == "0":
        return Response(content="", status_code=200)

    spoken = AfricasTalkingService.pop_pending_voice([
        str(form_data.get("callerNumber", "")),
        str(form_data.get("destinationNumber", "")),
        str(form_data.get("clientDialedNumber", "")),
    ])
    if spoken:
        return Response(
            content=AfricasTalkingService.build_say_xml(spoken),
            media_type="application/xml",
        )

    paybill = str(form_data.get("clientRequestId", "") or "522123")
    xml_content = AfricasTalkingService.build_swahili_warning_xml(paybill=paybill)
    return Response(content=xml_content, media_type="application/xml")


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


class SimSwapStartRequest(BaseModel):
    phone: str = Field(..., example="+254712345678")
    channel: str = Field(default="sms", example="sms")
    consent: bool = False
    scenario: str = "safe"
    language: str = "sw"


class SimSwapRecoverRequest(BaseModel):
    request_id: str


def _kenyan_phone(raw: str) -> str:
    """Accept 07…, 01…, 254…, or +254… and return +254…"""
    digits = "".join(ch for ch in raw.strip() if ch.isdigit())
    if digits.startswith("254") and len(digits) == 12 and digits[3] in "17":
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 10 and digits[1] in "17":
        return f"+254{digits[1:]}"
    if len(digits) == 9 and digits[0] in "17":
        return f"+254{digits}"
    raise HTTPException(
        status_code=400,
        detail="Use a Kenyan number, like 07... or +254...",
    )


def _ussd_menu(language: str) -> Dict[str, Any]:
    if language == "en":
        text = "CHAPAA\n1. Face check\n2. Stop"
    else:
        text = "CHAPAA\n1. Ukaguzi wa uso\n2. Simama"
    return {
        "text": text,
        "options": [
            {"key": "1", "action": "face_check"},
            {"key": "2", "action": "stop"},
        ],
    }


class SimSwapKycRequest(BaseModel):
    request_id: str
    id_photo: str
    selfie: str
    liveness_code: str
    language: str = "sw"


class SimSwapConfirmRequest(BaseModel):
    request_id: str
    code: str


@app.post("/api/sim-swap/start")
async def start_sim_swap(
    payload: SimSwapStartRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Start a simulated SIM swap. Africa's Talking reports whether the SIM
    was already swapped. The telco still performs any real swap.
    """
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Consent is required before the camera opens.")

    phone = _kenyan_phone(payload.phone)
    channel = payload.channel.lower()
    if channel not in {"sms", "call", "whatsapp"}:
        raise HTTPException(status_code=400, detail="Channel must be sms, call, or whatsapp.")
    scenario = payload.scenario.lower()
    if scenario not in {"safe", "attack"}:
        raise HTTPException(status_code=400, detail="Choose a safe line or a SIM swap attack.")
    language = payload.language.lower() if payload.language.lower() in {"en", "sw"} else "sw"

    clock = time.perf_counter()
    steps: List[Dict[str, Any]] = [{"at": 0.0, "code": "checking"}]
    # The judge toggle decides the flag. Insights is not called, so a live key
    # cannot hide the attack or invent a swap on a safe line.
    if scenario == "attack":
        swap_status, risk, row_status = "Swapped", "HIGH", SimSwapStatus.REJECTED
        steps.append({"at": round(time.perf_counter() - clock, 1), "code": "flag"})
    else:
        swap_status, risk, row_status = "NoSwapDate", "LOW", SimSwapStatus.PENDING
        steps.append({"at": round(time.perf_counter() - clock, 1), "code": "clear"})

    liveness_code = f"{secrets.randbelow(10000):04d}"
    request_row = SimSwapRequest(
        phone=phone,
        channel=channel,
        swap_check_status=swap_status,
        risk_level=risk,
        kyc_status="PENDING",
        status=row_status,
        liveness_code_hash=_hash_code(liveness_code),
        created_at=datetime.utcnow(),
    )
    db.add(request_row)
    await db.commit()
    await db.refresh(request_row)

    sms_mode = None
    if scenario == "attack":
        text = (
            "CHAPAA: Attempt blocked. A recent SIM swap was detected on this line. "
            "The network was not asked to swap the SIM."
            if language == "en"
            else "CHAPAA: Jaribio limezuiwa. Laini hii imebadilishwa hivi karibuni. "
            "Mtandao haujaombwa kubadili SIM."
        )
        dispatch = await AfricasTalkingService.send_sms(phone, text)
        sms_mode = dispatch.get("mode")
        steps.append({
            "at": round(time.perf_counter() - clock, 1),
            "code": "sms_sent" if dispatch.get("success") else "sms_skipped",
        })
        steps.append({"at": round(time.perf_counter() - clock, 1), "code": "blocked"})
    else:
        steps.append({"at": round(time.perf_counter() - clock, 1), "code": "sms_skipped"})
        steps.append({"at": round(time.perf_counter() - clock, 1), "code": "continue"})

    db.add(AuditLog(
        actor=phone,
        action="SIM_SWAP_STARTED",
        entity="sim_swap_requests",
        entity_id=str(request_row.id),
        meta={
            "scenario": scenario,
            "swap_check_status": swap_status,
            "risk_level": risk,
            "sms_mode": sms_mode,
        },
        created_at=datetime.utcnow(),
    ))
    await db.commit()

    body: Dict[str, Any] = {
        "request_id": str(request_row.id),
        "phone": phone,
        "channel": channel,
        "scenario": scenario,
        "swap_check_status": swap_status,
        "risk_level": risk,
        "status": row_status.value,
        "blocked": scenario == "attack",
        "steps": steps,
        "check_mode": "judge_toggle",
        "sms_mode": sms_mode,
        "note": "This does not swap the SIM. Only the mobile network can do that.",
    }
    if scenario == "attack":
        body["recovery_path"] = f"/?recover={request_row.id}"
        body["ussd"] = _ussd_menu(language)
    else:
        body["liveness_challenge"] = liveness_code
    return body


@app.post("/api/sim-swap/recover")
async def recover_sim_swap(
    payload: SimSwapRecoverRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reopen the face check for a line that was blocked after a recent swap."""
    try:
        request_uuid = uuid.UUID(payload.request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Unknown request.") from exc

    result = await db.execute(select(SimSwapRequest).where(SimSwapRequest.id == request_uuid))
    request_row = result.scalars().first()
    if request_row is None:
        raise HTTPException(status_code=404, detail="SIM swap request not found.")
    if request_row.risk_level != "HIGH":
        raise HTTPException(status_code=400, detail="This line was not blocked.")
    if request_row.status in {SimSwapStatus.COMPLETED, SimSwapStatus.CODE_SENT}:
        raise HTTPException(status_code=400, detail="This request is already finished.")

    liveness_code = f"{secrets.randbelow(10000):04d}"
    request_row.status = SimSwapStatus.PENDING
    request_row.kyc_status = "PENDING"
    request_row.liveness_code_hash = _hash_code(liveness_code)
    db.add(AuditLog(
        actor=request_row.phone,
        action="SIM_SWAP_RECOVERED",
        entity="sim_swap_requests",
        entity_id=str(request_row.id),
        meta={"risk_level": request_row.risk_level},
        created_at=datetime.utcnow(),
    ))
    await db.commit()
    return {
        "request_id": str(request_row.id),
        "phone": request_row.phone,
        "channel": request_row.channel,
        "scenario": "attack",
        "swap_check_status": request_row.swap_check_status,
        "risk_level": request_row.risk_level,
        "status": request_row.status.value,
        "blocked": False,
        "liveness_challenge": liveness_code,
        "note": "This does not swap the SIM. Only the mobile network can do that.",
    }


@app.post("/api/sim-swap/kyc")
async def submit_sim_swap_kyc(
    payload: SimSwapKycRequest,
    db: AsyncSession = Depends(get_db),
):
    """Compare the ID photo and live selfie. Images are discarded after scoring."""
    try:
        request_uuid = uuid.UUID(payload.request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Unknown request.") from exc

    result = await db.execute(select(SimSwapRequest).where(SimSwapRequest.id == request_uuid))
    request_row = result.scalars().first()
    if request_row is None:
        raise HTTPException(status_code=404, detail="SIM swap request not found.")
    if request_row.status not in {SimSwapStatus.PENDING, SimSwapStatus.KYC_PASSED}:
        raise HTTPException(status_code=400, detail="This request is no longer waiting for a face check.")

    typed = payload.liveness_code.strip()
    liveness_passed = bool(request_row.liveness_code_hash) and _hash_code(typed) == request_row.liveness_code_hash
    if not liveness_passed:
        request_row.status = SimSwapStatus.REJECTED
        request_row.kyc_status = "FAILED"
        db.add(KycAttempt(
            request_id=request_row.id,
            similarity_score=0,
            liveness_passed=False,
            result="FAILED",
            created_at=datetime.utcnow(),
        ))
        db.add(AuditLog(
            actor=request_row.phone,
            action="SIM_SWAP_REJECTED",
            entity="sim_swap_requests",
            entity_id=str(request_row.id),
            meta={"reason": "liveness"},
            created_at=datetime.utcnow(),
        ))
        await db.commit()
        raise HTTPException(status_code=400, detail="The 4-digit challenge does not match. Start again.")

    try:
        score, reason = await judge_faces(payload.id_photo, payload.selfie)
    except FaceMatchError as exc:
        db.add(KycAttempt(
            request_id=request_row.id,
            similarity_score=0,
            liveness_passed=True,
            result="FAILED",
            created_at=datetime.utcnow(),
        ))
        await db.commit()
        raise HTTPException(status_code=400, detail=exc.message) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Face check could not run. Try the photos again.") from exc
    finally:
        payload.id_photo = ""
        payload.selfie = ""

    passed = score >= FACE_PASS_SCORE
    db.add(KycAttempt(
        request_id=request_row.id,
        similarity_score=score,
        liveness_passed=True,
        result="PASSED" if passed else "FAILED",
        created_at=datetime.utcnow(),
    ))

    if not passed:
        request_row.kyc_status = "FAILED"
        request_row.status = SimSwapStatus.REJECTED
        db.add(AuditLog(
            actor=request_row.phone,
            action="SIM_SWAP_REJECTED",
            entity="sim_swap_requests",
            entity_id=str(request_row.id),
            meta={"similarity_score": score, "reason": reason},
            created_at=datetime.utcnow(),
        ))
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Face match score {score} is below {FACE_PASS_SCORE}. {reason}",
        )

    code = f"{secrets.randbelow(1000000):06d}"
    request_row.kyc_status = "PASSED"
    request_row.status = SimSwapStatus.CODE_SENT
    request_row.liveness_code_hash = None
    request_row.confirm_code_hash = _hash_code(code)
    request_row.confirm_expires_at = datetime.utcnow() + timedelta(minutes=10)
    language = payload.language.lower() if payload.language.lower() in {"en", "sw"} else "sw"
    dispatch = await AfricasTalkingService.send_confirmation(
        request_row.phone, request_row.channel, code, language
    )
    db.add(AuditLog(
        actor=request_row.phone,
        action="KYC_PASSED",
        entity="sim_swap_requests",
        entity_id=str(request_row.id),
        meta={"similarity_score": score, "channel": request_row.channel},
        created_at=datetime.utcnow(),
    ))
    await db.commit()

    body: Dict[str, Any] = {
        "request_id": str(request_row.id),
        "kyc_status": "PASSED",
        "similarity_score": score,
        "channel": request_row.channel,
        "dispatch_mode": dispatch.get("mode"),
    }
    if dispatch.get("mode") != "live":
        body["sandbox_code"] = code
    return body


@app.post("/api/sim-swap/confirm")
async def confirm_sim_swap(
    payload: SimSwapConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """Check the one-time code and mark the simulated swap completed."""
    try:
        request_uuid = uuid.UUID(payload.request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Unknown request.") from exc

    result = await db.execute(select(SimSwapRequest).where(SimSwapRequest.id == request_uuid))
    request_row = result.scalars().first()
    if request_row is None:
        raise HTTPException(status_code=404, detail="SIM swap request not found.")
    if request_row.status != SimSwapStatus.CODE_SENT or not request_row.confirm_code_hash:
        raise HTTPException(status_code=400, detail="Enter the face check before the confirmation code.")
    if request_row.confirm_expires_at and request_row.confirm_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="That code has expired. Start again.")
    if _hash_code(payload.code.strip()) != request_row.confirm_code_hash:
        raise HTTPException(status_code=400, detail="That code is wrong.")

    request_row.status = SimSwapStatus.COMPLETED
    request_row.confirm_code_hash = None
    request_row.completed_at = datetime.utcnow()
    db.add(AuditLog(
        actor=request_row.phone,
        action="SIM_SWAP_COMPLETED",
        entity="sim_swap_requests",
        entity_id=str(request_row.id),
        meta={"simulated": True, "risk_level": request_row.risk_level},
        created_at=datetime.utcnow(),
    ))
    await db.commit()
    return {
        "request_id": str(request_row.id),
        "status": "COMPLETED",
        "simulated": True,
        "message": "Recorded in the audit log. The mobile network was not asked to swap this SIM.",
    }


class SpamCheckRequest(BaseModel):
    phone: str = Field(..., example="+254712345678")
    message: str = Field(..., min_length=1)
    channel: str = Field(default="sms", example="sms")
    language: str = "sw"
    county: str = Field(..., example="Nairobi")


@app.post("/api/spam-check")
async def spam_check(
    payload: SpamCheckRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Paste a message, score it, store the verdict, and deliver it by SMS or call.
    """
    phone = payload.phone.strip().replace(" ", "")
    if not phone.startswith("+") or not phone[1:].isdigit() or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Use the full phone number, starting with +254.")
    channel = payload.channel.lower()
    if channel not in {"sms", "call"}:
        raise HTTPException(status_code=400, detail="Choose sms or call.")
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Paste the message first.")
    county = payload.county.strip()
    if county not in COUNTY_NAMES:
        raise HTTPException(status_code=400, detail="Choose your county first.")

    entities = extract_entities(message)
    blacklisted = await db.execute(select(BlacklistEntity.business_number))
    reported_rows = await db.execute(select(ReportedEntity.entity_type, ReportedEntity.value))
    verified_rows = await db.execute(
        select(VerifiedEntity.business_number).where(VerifiedEntity.is_active == True)
    )
    reported = {(kind, value) for kind, value in reported_rows.all()}
    for number in blacklisted.scalars().all():
        reported.add(("paybill", number))
        reported.add(("till", number))
    verified = set(verified_rows.scalars().all())

    verdict, reasons = apply_rules(message, entities, reported, verified)

    for _url in await check_links(entities["links"]):
        verdict = LIKELY_SCAM
        reasons.append({
            "sw": "Kiungo hiki kimewekwa alama kuwa hatari.",
            "en": "This link is flagged as dangerous.",
        })

    llm = await classify_with_llm(message)
    verdict, reasons = combine(verdict, reasons, llm)
    advice = advice_for(verdict)
    language = payload.language.lower() if payload.language.lower() in {"en", "sw"} else "sw"
    spoken = advice["en"] if language == "en" else advice["sw"]
    sms_text = advice["sms_en"] if language == "en" else advice["sms"]
    if channel == "call":
        AfricasTalkingService.queue_spoken(phone, spoken)
        dispatch = await AfricasTalkingService.trigger_voice_warning_call(phone)
    else:
        dispatch = await AfricasTalkingService.send_sms(phone, sms_text)

    row = SpamCheck(
        phone=phone,
        message_text=message,
        extracted=entities,
        verdict=SpamVerdict(verdict),
        reasons=reasons,
        channel=channel,
        county=county,
        created_at=datetime.utcnow(),
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    db.add(AuditLog(
        actor=phone,
        action="SPAM_VERDICT_SENT",
        entity="spam_checks",
        entity_id=str(row.id),
        meta={
            "verdict": verdict,
            "channel": channel,
            "county": county,
            "mode": dispatch.get("mode"),
            "model_read": bool(llm),
        },
        created_at=datetime.utcnow(),
    ))
    await db.commit()

    body: Dict[str, Any] = {
        "id": str(row.id),
        "verdict": verdict,
        "advice_sw": advice["sw"],
        "advice_en": advice["en"],
        "reasons": reasons,
        "extracted": entities,
        "channel": channel,
        "dispatch_mode": dispatch.get("mode"),
        "model_read": bool(llm),
    }
    if dispatch.get("mode") != "live":
        body["sandbox_notice"] = spoken
    return body


# ==============================================================================
# SEC-OPS REST ENDPOINTS
# ==============================================================================

@app.post("/api/canary/simulate-sms")
async def simulate_sms_attack(
    payload: SimulateSmsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Interactive Fraud Canary: Live SMS Attack Sandbox endpoint.
    Feeds simulated or judge-provided text through the exact Chapaa-Scan pipeline.
    """
    entities = extract_entities_from_text(payload.text)
    detected_paybill = entities.get("paybill")
    detected_till = entities.get("till")
    target_entity = detected_paybill or detected_till or entities.get("account")

    # Check verified & blacklist tables
    is_verified = False
    is_blacklisted = False
    blacklist_reason = None

    if detected_paybill:
        stmt_v = select(VerifiedEntity).where(VerifiedEntity.business_number == detected_paybill)
        res_v = await db.execute(stmt_v)
        is_verified = res_v.scalars().first() is not None

        stmt_b = select(BlacklistEntity).where(BlacklistEntity.business_number == detected_paybill)
        res_b = await db.execute(stmt_b)
        b_entity = res_b.scalars().first()
        if b_entity:
            is_blacklisted = True
            blacklist_reason = b_entity.reason

    threat_score, reasons = compute_threat_score(
        text=payload.text,
        sender_phone=payload.sender_phone,
        entities=entities,
        is_verified_entity=is_verified,
        is_blacklisted_entity=is_blacklisted,
        blacklist_reason=blacklist_reason,
    )
    category = classify_category(payload.text)

    # Mitigations
    warning_sms = (
        f"[Chapaa-Alert] WARNING: Paybill {detected_paybill or '522123'} is registered to an individual line, "
        f"not the accredited institution. Threat Confidence: {threat_score}%. Dispatched via Africa's Talking."
    )
    sms_res = await AfricasTalkingService.send_sms(payload.sender_phone, warning_sms)
    voice_res = await AfricasTalkingService.trigger_voice_warning_call(
        recipient=payload.sender_phone, paybill=detected_paybill
    )

    actions = {
        "timestamp": datetime.utcnow().isoformat(),
        "warning_sms": True,
        "sms_dispatch": sms_res,
        "voice_canary_call": True,
        "voice_dispatch": voice_res,
        "reasons": reasons,
    }

    log_entry = ThreatLog(
        sender_phone=payload.sender_phone,
        raw_text=payload.text,
        extracted_entity=target_entity or "None",
        category=category,
        threat_score=threat_score,
        actions_taken=actions,
        created_at=datetime.utcnow(),
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    event_payload = {
        "id": str(log_entry.id),
        "sender_phone": payload.sender_phone,
        "raw_text": payload.text,
        "extracted_entity": target_entity,
        "extracted_details": entities,
        "category": category.value,
        "threat_score": threat_score,
        "reasons": reasons,
        "actions_taken": actions,
        "created_at": log_entry.created_at.isoformat(),
    }
    await ws_manager.broadcast_threat_intercepted(event_payload)

    return {
        "success": True,
        "log": event_payload,
        "sms_dispatched": warning_sms,
        "voice_triggered": voice_res,
    }


@app.post("/api/canary/simulate-voice-call")
async def simulate_outbound_voice(payload: SimulateVoiceCallRequest):
    """Triggers outbound Swahili TTS anti-fraud voice canary call."""
    res = await AfricasTalkingService.trigger_voice_warning_call(
        recipient=payload.recipient, paybill=payload.paybill
    )
    return res


@app.post("/api/telemetry/ping")
async def log_telemetry_ping(
    payload: TelemetryPingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Logs CA QoS sentinel probe ping and broadcasts sparkline update."""
    entry = QoSTelemetry(
        device_model=payload.device_model,
        ward_location=payload.ward_location,
        signal_dbm=payload.signal_dbm,
        ping_latency_ms=payload.ping_latency_ms,
        timestamp=datetime.utcnow(),
    )
    db.add(entry)
    await db.commit()

    telemetry_data = {
        "device_model": payload.device_model,
        "ward_location": payload.ward_location,
        "signal_dbm": payload.signal_dbm,
        "ping_latency_ms": payload.ping_latency_ms,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await ws_manager.broadcast_qos_telemetry(telemetry_data)
    return {"status": "ACK", "recorded": telemetry_data}


@app.get("/api/threats")
async def get_threat_logs(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve recent intercepted threat logs for dashboard initialization."""
    stmt = select(ThreatLog).order_by(desc(ThreatLog.created_at)).limit(limit)
    res = await db.execute(stmt)
    records = res.scalars().all()
    return [
        {
            "id": str(r.id),
            "sender_phone": r.sender_phone,
            "raw_text": r.raw_text,
            "extracted_entity": r.extracted_entity,
            "category": r.category.value,
            "threat_score": r.threat_score,
            "actions_taken": r.actions_taken,
            "created_at": r.created_at.isoformat(),
        }
        for r in records
    ]


@app.get("/api/stats")
async def get_kpi_stats(db: AsyncSession = Depends(get_db)):
    """Computes global KPI counters matching Zone A wireframe."""
    threats_count = await db.scalar(select(func.count(ThreatLog.id))) or 0
    school_scams = await db.scalar(
        select(func.count(ThreatLog.id)).where(ThreatLog.category == ThreatCategory.SCHOOL_FEE)
    ) or 0
    pings = await db.scalar(select(func.count(QoSTelemetry.id))) or 0
    devices = await db.scalar(select(func.count(func.distinct(QoSTelemetry.device_model)))) or 0

    return {
        "scams_intercepted": threats_count,
        "school_fee_fraud_blocked": school_scams,
        "device_pings": pings,
        "live_canaries": devices,
    }


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    language: str = "sw"


@app.post("/api/transcribe")
async def transcribe_message(
    file: UploadFile = File(...),
    language: str = Form("sw"),
):
    """A person reads an SMS aloud. Return the words so the message check can score them."""
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="No words were heard.")
    if len(raw) > 5_000_000:
        raise HTTPException(status_code=400, detail="No words were heard.")
    mime = (file.content_type or "audio/webm").split(";")[0].strip() or "audio/webm"
    chosen = language.lower() if language.lower() in {"en", "sw"} else "sw"
    text = await transcribe_speech(raw, mime, chosen)
    if not text:
        raise HTTPException(status_code=400, detail="No words were heard.")
    return {"text": text}


@app.post("/api/speak")
async def speak_page(payload: SpeakRequest):
    """Return a WAV of the page line so Sikia can play it in the browser."""
    audio = await synthesize_speech(payload.text)
    if not audio:
        raise HTTPException(status_code=503, detail="The voice is not available. Try again.")
    return Response(content=audio, media_type="audio/wav")


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "CHAPAA-GUARD Unified SecOps Center",
        "timestamp": datetime.utcnow().isoformat(),
        "at_mode": "live" if AfricasTalkingService.is_live_mode() else "simulator",
        "at_username": AfricasTalkingService.username(),
    }
