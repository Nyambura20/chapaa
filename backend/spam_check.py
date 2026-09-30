"""
Paste-a-message checker.

Order: extract, rules, reported entities, optional link reputation, optional LLM.
The combined verdict is only LIKELY_SCAM, SUSPICIOUS, or NO_RED_FLAGS_FOUND.
A message is never called safe.
"""

import base64
import io
import json
import logging
import os
import re
import wave
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import httpx
from dotenv import load_dotenv

logger = logging.getLogger("chapaa.spam_check")

LIKELY_SCAM = "LIKELY_SCAM"
SUSPICIOUS = "SUSPICIOUS"
NO_RED_FLAGS_FOUND = "NO_RED_FLAGS_FOUND"
_RANK = {NO_RED_FLAGS_FOUND: 0, SUSPICIOUS: 1, LIKELY_SCAM: 2}

RE_URL = re.compile(r"(https?://[^\s<>\"']+|www\.[^\s<>\"']+)", re.IGNORECASE)
RE_PHONE = re.compile(r"(?:\+?254|0)(7\d{8}|1\d{8})")
RE_PAYBILL = re.compile(
    r"(?:Paybill|paybill|Business No\.?|P/Bill|Business Number)\s*:?\s*([0-9]{5,7})",
    re.IGNORECASE,
)
RE_TILL = re.compile(r"(?:Till|till|Buy Goods|Till No\.?)\s*:?\s*([0-9]{5,6})", re.IGNORECASE)
RE_AMOUNT = re.compile(r"(?:Ksh|KES|ksh|kes)\.?\s*([0-9,]+(?:\.[0-9]{2})?)", re.IGNORECASE)
RE_SENDER = re.compile(r"(?:from|sender|kutoka)\s*:?\s*([A-Za-z0-9]{2,12})", re.IGNORECASE)
RE_PIN = re.compile(
    r"\b(pin|otp|one[- ]time(?:\s+password)?|password|nenosiri|nambari ya siri|verification code|code ya siri)\b",
    re.IGNORECASE,
)
RE_PRIZE = re.compile(r"\b(you have won|congratulations|umeshinda|hongera|prize|jackpot)\b", re.IGNORECASE)
RE_BLOCK = re.compile(
    r"(account will be blocked|will be blocked|akaunti itafungwa|itafungwa|suspended|imezimwa)",
    re.IGNORECASE,
)
RE_LOAN_FEE = re.compile(
    r"(processing fee|registration fee|disbursement fee|ada ya usindikaji|ada ya mkopo)",
    re.IGNORECASE,
)
RE_REVERSAL = re.compile(
    r"(sent to wrong|wrong recipient|reverse immediately|wrong number|rudisha mara moja)",
    re.IGNORECASE,
)
RE_SCHOOL = re.compile(
    r"(school fee|school fees|tuition|term\s*[1-3]|bursar|maranda|karo)",
    re.IGNORECASE,
)
RE_URGENCY = re.compile(
    r"(immediately|within \d+ hours|today only|haraka|sasa hivi|ndani ya)",
    re.IGNORECASE,
)

ADVICE = {
    LIKELY_SCAM: {
        "sw": "Hii ni utapeli. Usitume pesa. Usijibu.",
        "en": "This looks like a scam. Do not send money. Do not reply.",
        "sms": "CHAPAA: UTAPELI. Usitume pesa. Usijibu. Uliza shule au benki yenyewe.",
        "sms_en": "CHAPAA: SCAM. Do not send money. Do not reply. Ask the school or bank yourself.",
    },
    SUSPICIOUS: {
        "sw": "Uwe makini. Uliza shule au benki yenyewe.",
        "en": "Be careful. Ask the school or the bank yourself.",
        "sms": "CHAPAA: UWE MAKINI. Uliza shule au benki yenyewe kabla ya kutuma pesa.",
        "sms_en": "CHAPAA: BE CAREFUL. Ask the school or bank yourself before you pay.",
    },
    NO_RED_FLAGS_FOUND: {
        "sw": "Hakuna ishara mbaya. Bado uliza mwenyewe.",
        "en": "No warning signs here. Still confirm with the real sender.",
        "sms": "CHAPAA: Hakuna ishara mbaya. Bado thibitisha na mwenyewe kupitia njia rasmi.",
        "sms_en": "CHAPAA: No warning signs. Still confirm with the real sender.",
    },
}


def _higher(left: str, right: str) -> str:
    return left if _RANK[left] >= _RANK[right] else right


def _clean_url(raw: str) -> str:
    url = raw.rstrip(".,);]")
    if url.lower().startswith("www."):
        return "http://" + url
    return url


def _phone(match: re.Match) -> str:
    return "+254" + match.group(1)


def extract_entities(text: str) -> Dict[str, List[str]]:
    """Pull links, phones, Paybills, Tills, amounts, and sender labels from the text."""
    amounts: List[str] = []
    for match in RE_AMOUNT.finditer(text):
        amounts.append(match.group(1))
    return {
        "links": [_clean_url(match.group(1)) for match in RE_URL.finditer(text)],
        "phones": list(dict.fromkeys(_phone(match) for match in RE_PHONE.finditer(text))),
        "paybills": list(dict.fromkeys(match.group(1) for match in RE_PAYBILL.finditer(text))),
        "tills": list(dict.fromkeys(match.group(1) for match in RE_TILL.finditer(text))),
        "amounts": amounts,
        "sender_ids": list(dict.fromkeys(match.group(1) for match in RE_SENDER.finditer(text))),
    }


def _hit(kind: str, value: str, reported: Set[Tuple[str, str]]) -> bool:
    return (kind, value.strip().lower()) in reported or (kind, value.strip()) in reported


def apply_rules(
    text: str,
    entities: Dict[str, List[str]],
    reported: Set[Tuple[str, str]],
    verified_paybills: Set[str],
) -> Tuple[str, List[Dict[str, str]]]:
    """
    Rules first. A PIN or OTP request is the strongest flag.
    Reported numbers, Paybills, Tills, and links are also strong.
    """
    verdict = NO_RED_FLAGS_FOUND
    reasons: List[Dict[str, str]] = []

    def add(level: str, sw: str, en: str) -> None:
        nonlocal verdict
        verdict = _higher(verdict, level)
        reasons.append({"sw": sw, "en": en})

    if RE_PIN.search(text):
        add(LIKELY_SCAM, "Unaombwa PIN au nambari ya siri.", "It asks for a PIN or a secret code.")

    for paybill in entities["paybills"]:
        if _hit("paybill", paybill, reported):
            add(LIKELY_SCAM, f"Paybill {paybill} imeripotiwa kuwa ya utapeli.", f"Paybill {paybill} was already reported.")
        elif RE_SCHOOL.search(text) and paybill not in verified_paybills:
            add(
                LIKELY_SCAM,
                f"Paybill {paybill} si akaunti rasmi ya shule hii.",
                f"Paybill {paybill} is not the official school account.",
            )
    for till in entities["tills"]:
        if _hit("till", till, reported):
            add(LIKELY_SCAM, f"Till {till} imeripotiwa kuwa ya utapeli.", f"Till {till} was already reported.")
    for phone in entities["phones"]:
        if _hit("phone", phone, reported):
            add(LIKELY_SCAM, "Nambari hii imeripotiwa kuwa ya utapeli.", "This phone number was already reported.")
    for link in entities["links"]:
        if _hit("url", link, reported) or _hit("url", link.lower(), reported):
            add(LIKELY_SCAM, "Kiungo hiki kimeripotiwa kuwa hatari.", "This link was already reported.")

    if RE_PRIZE.search(text) and (entities["links"] or entities["paybills"] or RE_PIN.search(text)):
        add(LIKELY_SCAM, "Zawadi inayoomba pesa au kiungo.", "A prize that asks for money or a link.")
    elif RE_PRIZE.search(text):
        add(SUSPICIOUS, "Ujumbe wa zawadi. Uwe makini.", "A prize message. Be careful.")

    if RE_BLOCK.search(text) and (RE_PIN.search(text) or entities["links"]):
        add(LIKELY_SCAM, "Inasema akaunti itafungwa na inaomba kitendo.", "It says the account will be blocked and asks you to act.")
    elif RE_BLOCK.search(text):
        add(SUSPICIOUS, "Inasema akaunti itafungwa.", "It says an account will be blocked.")

    if RE_LOAN_FEE.search(text):
        add(LIKELY_SCAM, "Inaomba ada kabla ya mkopo.", "It asks for a fee before a loan.")
    if RE_REVERSAL.search(text):
        add(LIKELY_SCAM, "Inaomba urudishe pesa haraka.", "It asks you to reverse money in a hurry.")
    if RE_URGENCY.search(text) and verdict == NO_RED_FLAGS_FOUND:
        add(SUSPICIOUS, "Inakuhimiza ufanye haraka.", "It pushes you to act quickly.")

    return verdict, reasons


async def check_links(urls: Iterable[str]) -> List[str]:
    """Optional. Runs only when a Safe Browsing or VirusTotal key is set."""
    flagged: List[str] = []
    safe_key = (os.getenv("SAFE_BROWSING_API_KEY") or "").strip()
    virus_key = (os.getenv("VIRUSTOTAL_API_KEY") or "").strip()
    if not safe_key and not virus_key:
        return flagged

    async with httpx.AsyncClient(timeout=8.0) as client:
        for url in urls:
            try:
                if safe_key and await _safe_browsing(client, safe_key, url):
                    flagged.append(url)
                    continue
                if virus_key and await _virus_total(client, virus_key, url):
                    flagged.append(url)
            except Exception as exc:
                logger.warning("Link check skipped for %s: %s", url, exc)
    return flagged


async def _safe_browsing(client: httpx.AsyncClient, key: str, url: str) -> bool:
    response = await client.post(
        "https://safebrowsing.googleapis.com/v4/threatMatches:find",
        params={"key": key},
        json={
            "client": {"clientId": "chapaa", "clientVersion": "1.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}],
            },
        },
    )
    response.raise_for_status()
    body = response.json()
    return bool(body.get("matches"))


async def _virus_total(client: httpx.AsyncClient, key: str, url: str) -> bool:
    response = await client.post(
        "https://www.virustotal.com/api/v3/urls",
        headers={"x-apikey": key},
        data={"url": url},
    )
    if response.status_code >= 400:
        return False
    stats = (
        response.json()
        .get("data", {})
        .get("attributes", {})
        .get("stats", {})
    )
    return int(stats.get("malicious") or 0) > 0


_GEMINI_SAFETY = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
]


def _pcm_to_wav(pcm: bytes, rate: int) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(pcm)
    return buf.getvalue()


async def synthesize_speech(text: str) -> Optional[bytes]:
    """Read a short line aloud. Returns WAV bytes, or nothing when the key is missing."""
    api_key, _model = _gemini_settings()
    if not api_key:
        return None
    spoken = " ".join(text.split())[:500]
    if not spoken:
        return None
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "content-type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": spoken}]}],
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}
                        },
                    },
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        logger.warning("Voice skipped: %s", exc)
        return None

    parts = ((payload.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    for part in parts:
        inline = part.get("inlineData") or {}
        raw = inline.get("data")
        if not raw:
            continue
        audio = base64.b64decode(raw)
        mime = str(inline.get("mimeType") or "").lower()
        if audio.startswith(b"RIFF") or "wav" in mime:
            return audio
        rate = 24000
        if "rate=" in mime:
            try:
                rate = int(mime.split("rate=")[1].split(";")[0].strip())
            except ValueError:
                rate = 24000
        return _pcm_to_wav(audio, rate)
    return None


async def transcribe_speech(audio: bytes, mime: str, language: str) -> Optional[str]:
    """Turn a spoken SMS into the words that were said."""
    api_key, model = _gemini_settings()
    if not api_key or not audio:
        return None
    if "tts" in model:
        model = "gemini-3.8-flash"
    heard = "Kiswahili or Kenyan English" if language == "sw" else "English or Kiswahili"
    prompt = (
        f"The speaker is reading an SMS aloud in {heard}. "
        "Write only the message they read. Do not translate. Do not add advice. "
        "If you hear no words, reply with an empty string."
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    request = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inlineData": {"mimeType": mime or "audio/webm", "data": base64.b64encode(audio).decode("ascii")}},
            ]
        }]
    }
    payload = None
    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            for attempt in range(2):
                response = await client.post(
                    url,
                    headers={"x-goog-api-key": api_key, "content-type": "application/json"},
                    json=request,
                )
                if response.status_code in {429, 503} and attempt == 0:
                    continue
                response.raise_for_status()
                payload = response.json()
                break
    except Exception as exc:
        logger.warning("Transcription skipped: %s", exc)
        return None
    if not payload:
        return None

    parts = ((payload.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    spoken_parts = [part for part in parts if not part.get("thought")]
    text = " ".join(str(part.get("text") or "").strip() for part in (spoken_parts or parts)).strip()
    text = text.strip("`").strip()
    if text.lower() in {"", "empty", "empty string", "none"}:
        return None
    return text[:2000]


def _gemini_settings() -> Tuple[str, str]:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip().strip('"').strip("'")
    model = (os.getenv("LLM_MODEL") or "gemini-3.8-flash").strip().strip('"').strip("'")
    return api_key, model


async def classify_with_llm(text: str) -> Optional[Dict[str, Any]]:
    """Optional. Returns a verdict object only when GEMINI_API_KEY is set."""
    api_key, model = _gemini_settings()
    if not api_key:
        return None
    prompt = (
        "You help a person in Kenya decide whether a pasted SMS is a scam. "
        "Reply with JSON only, no markdown. "
        'Schema: {"verdict":"LIKELY_SCAM|SUSPICIOUS|NO_RED_FLAGS_FOUND",'
        '"confidence":0.0,"red_flags":[{"sw":"one short Kiswahili reason","en":"one short English reason"}]}. '
        "Give at most two red flags. Never use the words safe or legit. "
        "A request for a PIN, a secret code, or payment to an unknown paybill is LIKELY_SCAM.\n\n"
        f"{text[:2000]}"
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": 512,
            "temperature": 0,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 0},
        },
        "safetySettings": _GEMINI_SAFETY,
    }
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "content-type": "application/json"},
                json=body,
            )
            if response.status_code == 400 and "thinkingConfig" in response.text:
                generation = dict(body["generationConfig"])
                generation.pop("thinkingConfig", None)
                body = {**body, "generationConfig": generation}
                response = await client.post(
                    url,
                    headers={"x-goog-api-key": api_key, "content-type": "application/json"},
                    json=body,
                )
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        logger.warning("LLM classifier skipped: %s", exc)
        return None

    candidates = payload.get("candidates") or []
    if not candidates:
        logger.warning("LLM classifier skipped: %s", payload.get("promptFeedback") or "no candidate")
        return None
    parts = (candidates[0].get("content") or {}).get("parts") or []
    raw = "".join(str(part.get("text") or "") for part in parts)
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        logger.warning("LLM classifier skipped: response was not JSON")
        return None
    try:
        parsed = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None
    verdict = str(parsed.get("verdict") or "")
    if verdict not in _RANK:
        return None
    return parsed


def _flag_pair(flag: Any) -> Optional[Dict[str, str]]:
    if isinstance(flag, dict):
        sw = str(flag.get("sw") or flag.get("en") or "").strip()
        en = str(flag.get("en") or flag.get("sw") or "").strip()
        if not sw and not en:
            return None
        return {"sw": sw or en, "en": en or sw}
    text = str(flag).strip()
    if not text:
        return None
    return {"sw": text, "en": text}


def combine(rule_verdict: str, extra_reasons: List[Dict[str, str]], llm: Optional[Dict[str, Any]]) -> Tuple[str, List[Dict[str, str]]]:
    """A strong signal can only raise the verdict. It cannot lower one."""
    verdict = rule_verdict
    reasons = list(extra_reasons)
    if llm:
        verdict = _higher(verdict, str(llm.get("verdict")))
        for flag in (llm.get("red_flags") or [])[:2]:
            pair = _flag_pair(flag)
            if pair:
                reasons.append(pair)
    return verdict, reasons


def advice_for(verdict: str) -> Dict[str, str]:
    return ADVICE[verdict]
