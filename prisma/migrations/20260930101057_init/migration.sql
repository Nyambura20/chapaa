-- CreateTable
CREATE TABLE "spam_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "extracted" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "county" TEXT,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "threat_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sender_phone" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "extracted_entity" TEXT,
    "category" TEXT NOT NULL,
    "threat_score" INTEGER NOT NULL,
    "actions_taken" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "qos_telemetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "device_model" TEXT NOT NULL,
    "ward_location" TEXT NOT NULL,
    "signal_dbm" INTEGER NOT NULL,
    "ping_latency_ms" INTEGER NOT NULL,
    "timestamp" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "sim_swap_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "swap_check_status" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "kyc_status" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "liveness_code_hash" TEXT,
    "confirm_code_hash" TEXT,
    "confirm_expires_at" TEXT,
    "created_at" TEXT NOT NULL,
    "completed_at" TEXT
);
