"""
Database Seeding Script for CHAPAA-GUARD.
Populates verified national schools & CBK-regulated banks alongside known rogue Paybills
and predatory loan blacklists.
"""

import asyncio
import uuid
from datetime import datetime
from backend.database import engine, Base, AsyncSessionLocal
from backend.models import (
    VerifiedEntity,
    BlacklistEntity,
    EntityType,
    ThreatLog,
    ThreatCategory,
    QoSTelemetry,
)


async def ensure_reference_data() -> None:
    """Load official Paybills and known scam numbers once, if the tables are empty."""
    from sqlalchemy import func, select

    async with AsyncSessionLocal() as session:
        verified_count = await session.scalar(select(func.count(VerifiedEntity.id))) or 0
        if verified_count:
            return
        session.add_all([
            VerifiedEntity(
                name="Maranda High School",
                entity_type=EntityType.SCHOOL,
                business_number="890300",
                official_account_prefix="ADM",
                is_active=True,
            ),
            VerifiedEntity(
                name="Kenya High School",
                entity_type=EntityType.SCHOOL,
                business_number="911200",
                official_account_prefix="KHS",
                is_active=True,
            ),
            VerifiedEntity(
                name="Alliance High School",
                entity_type=EntityType.SCHOOL,
                business_number="800100",
                official_account_prefix="AHS",
                is_active=True,
            ),
            VerifiedEntity(
                name="Kenya Commercial Bank (KCB M-PESA)",
                entity_type=EntityType.BANK,
                business_number="522522",
                official_account_prefix=None,
                is_active=True,
            ),
            VerifiedEntity(
                name="Equity Bank Kenya",
                entity_type=EntityType.BANK,
                business_number="247247",
                official_account_prefix=None,
                is_active=True,
            ),
            BlacklistEntity(
                business_number="522123",
                reason="Rogue Paybill impersonating Maranda High School",
                risk_score=98,
                flag_count=14,
            ),
            BlacklistEntity(
                business_number="98821",
                reason="Predatory loan till charging an upfront fee",
                risk_score=95,
                flag_count=29,
            ),
            BlacklistEntity(
                business_number="400200",
                reason="Spoofed bank Paybill used in reversal scams",
                risk_score=92,
                flag_count=8,
            ),
        ])
        await session.commit()


async def seed():
    print("🌱 Connecting to database and creating tables if not present...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        from sqlalchemy import func, select

        already = await session.scalar(select(func.count(VerifiedEntity.id))) or 0
        if already:
            print("Reference Paybills already loaded. Seeding sample logs only if missing.")
        # 1. Seed 5 Verified Kenyan Schools & Banks
        verified_data = [
            VerifiedEntity(
                id=uuid.uuid4(),
                name="Maranda High School",
                entity_type=EntityType.SCHOOL,
                business_number="890300",
                official_account_prefix="ADM",
                is_active=True,
            ),
            VerifiedEntity(
                id=uuid.uuid4(),
                name="Kenya High School",
                entity_type=EntityType.SCHOOL,
                business_number="911200",
                official_account_prefix="KHS",
                is_active=True,
            ),
            VerifiedEntity(
                id=uuid.uuid4(),
                name="Alliance High School",
                entity_type=EntityType.SCHOOL,
                business_number="800100",
                official_account_prefix="AHS",
                is_active=True,
            ),
            VerifiedEntity(
                id=uuid.uuid4(),
                name="Kenya Commercial Bank (KCB M-PESA)",
                entity_type=EntityType.BANK,
                business_number="522522",
                official_account_prefix=None,
                is_active=True,
            ),
            VerifiedEntity(
                id=uuid.uuid4(),
                name="Equity Bank Kenya",
                entity_type=EntityType.BANK,
                business_number="247247",
                official_account_prefix=None,
                is_active=True,
            ),
        ]

        # 2. Seed 3 Known Scam Entities
        blacklist_data = [
            BlacklistEntity(
                id=uuid.uuid4(),
                business_number="522123",
                reason="Rogue Paybill impersonating Maranda High School Bursar - Registered to an individual MSISDN",
                risk_score=98,
                flag_count=14,
                reported_at=datetime.utcnow(),
            ),
            BlacklistEntity(
                id=uuid.uuid4(),
                business_number="98821",
                reason="Predatory Loan Till charging illegal upfront advance fee for non-existent Fuliza limit increase",
                risk_score=95,
                flag_count=29,
                reported_at=datetime.utcnow(),
            ),
            BlacklistEntity(
                id=uuid.uuid4(),
                business_number="400200",
                reason="Spoofed Coop Bank settlement Paybill used in social engineering phantom reversal scams",
                risk_score=92,
                flag_count=8,
                reported_at=datetime.utcnow(),
            ),
        ]

        # 3. Seed Initial Threat Logs for SecOps Stream
        initial_threats = [
            ThreatLog(
                id=uuid.uuid4(),
                sender_phone="+254718392412",
                raw_text="Dear Parent, pay KES 14,500 Term 3 fees to Paybill 522123 Acc 0178 MARANDA immediately to avoid student being sent home.",
                extracted_entity="522123",
                category=ThreatCategory.SCHOOL_FEE,
                threat_score=94,
                actions_taken={
                    "warning_sms": True,
                    "voice_canary_call": True,
                    "reasons": [
                        "CRITICAL: Entity '522123' is on CA/CBK Fraud Blacklist (Rogue Paybill registered to individual)",
                        "Urgency coercion patterns detected."
                    ]
                },
                created_at=datetime.utcnow(),
            ),
            ThreatLog(
                id=uuid.uuid4(),
                sender_phone="+254722819200",
                raw_text="CONGRATULATIONS! Your Hustler Fund loan of KES 50,000 is approved. Send KES 1,200 processing fee to Till 98821 to disburse now.",
                extracted_entity="98821",
                category=ThreatCategory.LOAN_SCAM,
                threat_score=91,
                actions_taken={
                    "warning_sms": True,
                    "voice_canary_call": True,
                    "reasons": [
                        "CRITICAL: Entity '98821' on CA/CBK Fraud Blacklist (Predatory Loan Till)",
                        "PREDATORY: Advance fee requested before loan disbursement"
                    ]
                },
                created_at=datetime.utcnow(),
            ),
            ThreatLog(
                id=uuid.uuid4(),
                sender_phone="+254701988231",
                raw_text="Confirmed. You have received Ksh 3,850 from MARY WANJIKU. Wait, I sent by mistake to wrong number, kindly reverse to 0701988231.",
                extracted_entity="3850",
                category=ThreatCategory.FAKE_REVERSAL,
                threat_score=84,
                actions_taken={
                    "warning_sms": True,
                    "voice_canary_call": True,
                    "reasons": [
                        "FAKE REVERSAL: Social engineering attempt to induce panic refund of phantom funds."
                    ]
                },
                created_at=datetime.utcnow(),
            ),
        ]

        # 4. Seed Initial QoS Telemetry
        initial_pings = [
            QoSTelemetry(
                id=uuid.uuid4(),
                device_model="Infinix mobility X692-GL",
                ward_location="Changamwe",
                signal_dbm=-78,
                ping_latency_ms=22,
                timestamp=datetime.utcnow(),
            ),
            QoSTelemetry(
                id=uuid.uuid4(),
                device_model="Samsung A55x",
                ward_location="Bamburi",
                signal_dbm=-82,
                ping_latency_ms=27,
                timestamp=datetime.utcnow(),
            ),
        ]

        if not already:
            session.add_all(verified_data)
            session.add_all(blacklist_data)
        session.add_all(initial_threats)
        session.add_all(initial_pings)
        await session.commit()
        print("✅ Database successfully seeded with 5 Verified Entities, 3 Blacklists, Initial Threats, and Telemetry!")


if __name__ == "__main__":
    asyncio.run(seed())
