"""
Regex extraction and heuristic fraud-scoring algorithms for CHAPAA-GUARD.
Performs entity extraction, entity verification cross-check, and risk scoring.
"""

import re
from typing import Dict, Any, Optional, Tuple, List
from backend.models import ThreatCategory


# Pre-compiled high-performance regular expressions for Kenyan mobile money formats
RE_AMOUNT = re.compile(r"(?:Ksh|KES|ksh|kes)\.?\s*([0-9,]+(?:\.[0-9]{2})?)", re.IGNORECASE)
RE_PAYBILL = re.compile(r"(?:Paybill|paybill|Business No\.?|P/Bill|Business Number)\s*:?\s*([0-9]{5,7})", re.IGNORECASE)
RE_TILL = re.compile(r"(?:Till|till|Buy Goods|Till No\.?)\s*:?\s*([0-9]{5,6})", re.IGNORECASE)
RE_ACCOUNT = re.compile(r"(?:Acc|Account|Ref|Student No|Adm)\.?\s*:?\s*([A-Za-z0-9_-]+)", re.IGNORECASE)
RE_PHONE = re.compile(r"(?:\+?254|0)?(7\d{8}|1\d{8})")
RE_MPESA_CODE = re.compile(r"\b([A-Z0-9]{10})\b")

# Threat Heuristic Keyword Dictionaries
SCHOOL_KEYWORDS = [
    "term 1", "term 2", "term 3", "school fees", "tuition", "admission",
    "form 1", "form 2", "form 3", "form 4", "grade", "headteacher",
    "principal", "bursar", "maranda", "kenya high", "alliance", "mang'u"
]

LOAN_KEYWORDS = [
    "processing fee", "registration fee", "instant loan", "approved loan",
    "crb clearance", "unlock loan", "limit increase", "disbursement fee",
    "tala loan", "branch loan", "fuliza limit", "hustler fund"
]

REVERSAL_KEYWORDS = [
    "sent to wrong", "wrong recipient", "reverse immediately", "click link to reverse",
    "dial *", "confirms you have received ksh", "reversal request"
]


def extract_entities_from_text(text: str) -> Dict[str, Any]:
    """
    Extract financial identifiers, amounts, paybills, and accounts from raw SMS text.
    """
    amount_match = RE_AMOUNT.search(text)
    paybill_match = RE_PAYBILL.search(text)
    till_match = RE_TILL.search(text)
    account_match = RE_ACCOUNT.search(text)
    mpesa_code_match = RE_MPESA_CODE.search(text)

    amount_val: Optional[float] = None
    if amount_match:
        try:
            amount_val = float(amount_match.group(1).replace(",", ""))
        except ValueError:
            pass

    return {
        "amount": amount_val,
        "amount_str": amount_match.group(1) if amount_match else None,
        "paybill": paybill_match.group(1) if paybill_match else None,
        "till": till_match.group(1) if till_match else None,
        "account": account_match.group(1) if account_match else None,
        "mpesa_code": mpesa_code_match.group(1) if mpesa_code_match else None,
    }


def classify_category(text: str) -> ThreatCategory:
    """Classify SMS into operational fraud categories based on contextual heuristics."""
    lowered = text.lower()

    if any(k in lowered for k in SCHOOL_KEYWORDS):
        return ThreatCategory.SCHOOL_FEE
    if any(k in lowered for k in LOAN_KEYWORDS):
        return ThreatCategory.LOAN_SCAM
    if any(k in lowered for k in REVERSAL_KEYWORDS):
        return ThreatCategory.FAKE_REVERSAL

    return ThreatCategory.SAFE


def compute_threat_score(
    text: str,
    sender_phone: str,
    entities: Dict[str, Any],
    is_verified_entity: bool,
    is_blacklisted_entity: bool,
    blacklist_reason: Optional[str] = None,
) -> Tuple[int, List[str]]:
    """
    Calculate 0-100 threat confidence score and return explainable audit triggers.
    """
    score = 0
    reasons = []

    # 1. Blacklist check (immediate critical threat)
    if is_blacklisted_entity:
        score += 85
        reasons.append(f"CRITICAL: Entity '{entities.get('paybill') or entities.get('till')}' is on CA/CBK Fraud Blacklist ({blacklist_reason or 'Reported scam'})")

    # 2. Category specific weights
    category = classify_category(text)
    lowered = text.lower()

    if category == ThreatCategory.SCHOOL_FEE:
        if entities.get("paybill"):
            if not is_verified_entity and not is_blacklisted_entity:
                score += 75
                reasons.append(f"UNVERIFIED PAYBILL: Paybill {entities.get('paybill')} is not the official Ministry/KNEC registered account for this institution.")
            elif is_verified_entity:
                score -= 30
                reasons.append("VERIFIED: Matches official Ministry of Education approved Paybill.")
        else:
            score += 40
            reasons.append("School fee notice requested direct phone number/unregistered till.")

    elif category == ThreatCategory.LOAN_SCAM:
        if "fee" in lowered or "advance" in lowered or "registration" in lowered:
            score += 70
            reasons.append("PREDATORY: Advance fee requested before loan disbursement (Violates CBK Digital Credit Provider Act).")
        else:
            score += 45
            reasons.append("Unsolicited credit offer with urgency framing.")

    elif category == ThreatCategory.FAKE_REVERSAL:
        score += 80
        reasons.append("FAKE REVERSAL: Social engineering attempt to induce panic refund of phantom funds.")

    # 3. GSM / Sender Check: Individual 10-digit number claiming to be a corporate bank or school
    if re.search(r"^(?:\+?254|0)?7\d{8}$", sender_phone):
        if any(corp in lowered for corp in ["kcb", "equity", "mpesa", "safaricom", "high school", "academy"]):
            score += 25
            reasons.append("GSM MISMATCH: Corporate communication dispatched from personal subscriber MSISDN.")

    # 4. Urgency and panic triggers
    if any(w in lowered for w in ["immediately", "within 2 hours", "today only", "will be blocked", "suspended"]):
        score += 15
        reasons.append("Urgency coercion patterns detected.")

    # Clamping
    final_score = max(5, min(100, score))
    return final_score, reasons
