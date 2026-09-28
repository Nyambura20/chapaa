"""
SQLAlchemy Async Database Models for CHAPAA-GUARD.
Includes Verified Entities, Blacklist Entities, Threat Logs, POS Transactions, and QoS Telemetry.
"""

import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
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


class PosTransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    AUTHENTICATED = "AUTHENTICATED"
    REJECTED = "REJECTED"


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


class PosTransaction(Base):
    """
    Merchant POS zero-trust transactions requiring out-of-band IVR/DTMF customer verification.
    """
    __tablename__ = "pos_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    merchant_id = Column(String(100), nullable=False, index=True)
    customer_phone = Column(String(50), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    auth_token = Column(String(50), nullable=True, unique=True, index=True)
    status = Column(SQLEnum(PosTransactionStatus), nullable=False, default=PosTransactionStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


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
