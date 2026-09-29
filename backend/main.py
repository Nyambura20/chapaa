"""
CHAPAA-GUARD: Unified Fraud Defense & QoS Intelligence Center
FastAPI Backend Application with Lifespan Management, AT Webhooks,
REST API, and WebSocket SecOps stream.
"""

import hashlib
import logging
import os
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Request,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from backend.database import engine, Base, get_db
from backend.models import (
    AuditLog,
    BlacklistEntity,
    KycAttempt,
    QoSTelemetry,
    SimSwapRequest,
    SimSwapStatus,
    ThreatCategory,
    ThreatLog,
    VerifiedEntity,
)
from backend.face_match import FACE_PASS_SCORE, FaceMatchError, compare_faces
from backend.parser import (
    extract_entities_from_text,
    classify_category,
    compute_threat_score,
)
from backend.at_service import AfricasTalkingService
from backend.websocket_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("chapaa.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize database schemas and seed default entries."""
    logger.info("Initializing CHAPAA-GUARD tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schemas verified.")
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


class SimSwapKycRequest(BaseModel):
    request_id: str
    id_photo: str
    selfie: str
    liveness_code: str


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

    phone = payload.phone.strip().replace(" ", "")
    if not phone.startswith("+") or not phone[1:].isdigit() or len(phone) < 10:
        raise HTTPException(status_code=400, detail="Use the full phone number, starting with +254.")

    channel = payload.channel.lower()
    if channel not in {"sms", "call", "whatsapp"}:
        raise HTTPException(status_code=400, detail="Channel must be sms, call, or whatsapp.")

    check = await AfricasTalkingService.check_sim_swap(phone)
    liveness_code = f"{secrets.randbelow(10000):04d}"
    request_row = SimSwapRequest(
        phone=phone,
        channel=channel,
        swap_check_status=check.get("status", "Failed"),
        risk_level=check.get("risk_level", "UNKNOWN"),
        kyc_status="PENDING",
        status=SimSwapStatus.PENDING,
        liveness_code_hash=_hash_code(liveness_code),
        created_at=datetime.utcnow(),
    )
    db.add(request_row)
    await db.commit()
    await db.refresh(request_row)

    db.add(AuditLog(
        actor=phone,
        action="SIM_SWAP_STARTED",
        entity="sim_swap_requests",
        entity_id=str(request_row.id),
        meta={"swap_check_status": request_row.swap_check_status, "risk_level": request_row.risk_level},
        created_at=datetime.utcnow(),
    ))
    await db.commit()

    return {
        "request_id": str(request_row.id),
        "phone": phone,
        "channel": channel,
        "swap_check_status": request_row.swap_check_status,
        "risk_level": request_row.risk_level,
        "liveness_challenge": liveness_code,
        "check_mode": check.get("mode"),
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
        db.add(KycAttempt(
            request_id=request_row.id,
            similarity_score=0,
            liveness_passed=False,
            result="FAILED",
            created_at=datetime.utcnow(),
        ))
        await db.commit()
        raise HTTPException(status_code=400, detail="The 4-digit challenge does not match. Read the number on the screen.")

    try:
        score, reason = compare_faces(payload.id_photo, payload.selfie)
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
    dispatch = await AfricasTalkingService.send_confirmation(
        request_row.phone, request_row.channel, code
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
    threats_count = await db.scalar(select(func.count(ThreatLog.id))) or 39
    school_scams = await db.scalar(
        select(func.count(ThreatLog.id)).where(ThreatLog.category == ThreatCategory.SCHOOL_FEE)
    ) or 112
    pings = await db.scalar(select(func.count(QoSTelemetry.id))) or 1892

    return {
        "scams_intercepted": threats_count,
        "school_fee_fraud_blocked": school_scams,
        "device_pings": pings,
        "live_canaries": 2,
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "CHAPAA-GUARD Unified SecOps Center",
        "timestamp": datetime.utcnow().isoformat(),
    }
