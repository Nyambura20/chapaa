"""
SQLAlchemy Async Database Models for CHAPAA-GUARD.
Includes Verified Entities, Blacklist Entities, Threat Logs, QoS Telemetry, and SIM swap requests.
"""

import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    DateTime,
    Enum as SQLEnum,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import JSON
from backend.database import Base


class EntityType(str, enum.Enum):
    SCHOOL = "SCHOOL"
    LENDER = "LENDER"
    SACCO = "SACCO"
    BANK = "BANK"
    GOVERNMENT = "GOVERNMENT"


class ThreatCategory(str, enum.Enum):
    SCHOOL_FEE = "SCHOOL_FEE"
    LOAN_SCAM = "LOAN_SCAM"
    FAKE_REVERSAL = "FAKE_REVERSAL"
    SAFE = "SAFE"


class VerifiedEntity(Base):
    """
    Legitimate institutions (accredited national schools, CBK-licensed digital lenders, tier 1 banks).
    Cross-checked when paybill/till entities are detected in SMS.
    """
    __tablename__ = "verified_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    entity_type = Column(SQLEnum(EntityType), nullable=False, default=EntityType.SCHOOL)
    business_number = Column(String(50), nullable=False, index=True)
    official_account_prefix = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_verified_business_number", "business_number"),
    )


class BlacklistEntity(Base):
    """
    Flagged predatory lenders, known smishing phone lines, and reported fraudulent Paybills.
    """
    __tablename__ = "blacklist_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_number = Column(String(50), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    risk_score = Column(Integer, nullable=False, default=100)
    flag_count = Column(Integer, nullable=False, default=1)
    reported_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_blacklist_business_number", "business_number"),
    )


class ThreatLog(Base):
    """
    Audit log of intercepted incoming SMS forwarded to the AT shortcode.
    """
    __tablename__ = "threat_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_phone = Column(String(50), nullable=False, index=True)
    raw_text = Column(Text, nullable=False)
    extracted_entity = Column(String(255), nullable=True)
    category = Column(SQLEnum(ThreatCategory), nullable=False, default=ThreatCategory.SAFE)
    threat_score = Column(Integer, nullable=False, default=0)
    actions_taken = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    __table_args__ = (
        Index("idx_threat_created_at", "created_at"),
    )


class QoSTelemetry(Base):
    """
    Continuous hardware telemetry sent by field sentinel Android probes
    (e.g., Infinix X692-GL, Samsung A55x) for Communications Authority (CA) compliance.
    """
    __tablename__ = "qos_telemetry"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_model = Column(String(100), nullable=False, index=True)
    ward_location = Column(String(100), nullable=False, index=True)
    signal_dbm = Column(Integer, nullable=False)
    ping_latency_ms = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class SimSwapStatus(str, enum.Enum):
    PENDING = "PENDING"
    KYC_PASSED = "KYC_PASSED"
    CODE_SENT = "CODE_SENT"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class SimSwapRequest(Base):
    """
    Simulated SIM replacement. Only the telco can swap a SIM.
    This row records the check, the face-match result, and the confirmation code.
    """
    __tablename__ = "sim_swap_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(50), nullable=False, index=True)
    channel = Column(String(20), nullable=False, default="sms")
    swap_check_status = Column(String(40), nullable=False, default="UNKNOWN")
    risk_level = Column(String(20), nullable=False, default="UNKNOWN")
    kyc_status = Column(String(20), nullable=False, default="PENDING")
    status = Column(SQLEnum(SimSwapStatus), nullable=False, default=SimSwapStatus.PENDING)
    liveness_code_hash = Column(String(128), nullable=True)
    confirm_code_hash = Column(String(128), nullable=True)
    confirm_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)


class KycAttempt(Base):
    """Face-match result only. Photos are never stored."""
    __tablename__ = "kyc_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    similarity_score = Column(Integer, nullable=False, default=0)
    liveness_passed = Column(Boolean, nullable=False, default=False)
    result = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SpamVerdict(str, enum.Enum):
    LIKELY_SCAM = "LIKELY_SCAM"
    SUSPICIOUS = "SUSPICIOUS"
    NO_RED_FLAGS_FOUND = "NO_RED_FLAGS_FOUND"


class SpamCheck(Base):
    """One pasted message, the combined verdict, and how it was delivered."""
    __tablename__ = "spam_checks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(50), nullable=False, index=True)
    message_text = Column(Text, nullable=False)
    extracted = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=dict)
    verdict = Column(SQLEnum(SpamVerdict), nullable=False)
    reasons = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=list)
    channel = Column(String(20), nullable=False)
    county = Column(String(40), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class ReportedEntity(Base):
    """Numbers, Paybills, Tills, and links already reported as malicious."""
    __tablename__ = "reported_entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(20), nullable=False)
    value = Column(String(300), nullable=False)
    report_count = Column(Integer, nullable=False, default=1)
    first_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_reported_type_value", "entity_type", "value", unique=True),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor = Column(String(50), nullable=False)
    action = Column(String(80), nullable=False)
    entity = Column(String(80), nullable=False)
    entity_id = Column(String(64), nullable=False)
    meta = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
