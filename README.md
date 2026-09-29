# CHAPAA-GUARD: Unified Fraud Defense & QoS Intelligence Center
### Built for Africa's Talking (AT) Telecom Innovate Hackathon

**CHAPAA-GUARD** is a SecOps platform for real-time smishing and Paybill fraud interception, Swahili voice warnings via Africa's Talking, and distributed Android QoS canary telemetry for Communications Authority of Kenya (CA) compliance.

---

## 🏛️ System Architecture

```
[ Kenya Mobile Subscriber ]
       │ (Forwards a suspicious SMS)
       ▼
[ Africa's Talking Telephony Gateways ]
       │
       ├── SMS API (Incoming & Outbound Alerts - Shortcode 20880)
       └── Voice API (Outbound Swahili warning call)
       │
       ▼ (HTTP POST Webhooks)
[ CHAPAA-GUARD Engine (FastAPI) ]
       │
       ├── 1. Chapaa-Scan: Regex Entity Extractor & Threat Scorer (0-100%)
       │      ├── Cross-checks Verified Schools & CBK-licensed Lenders
       │      └── Intercepts Rogue/Blacklisted Paybills
       ├── 2. Swahili Voice Warning (Voice XML <Play> on answer)
       ├── 3. QoS Sentinel Auditor: Hardware Probes (Infinix, Samsung) Telemetry
       └── 4. Native WebSocket Hub: Real-time SecOps event broadcast
       │
       ▼
[ SecOps Control Deck (Next.js) ]
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL 15+ (or Docker)
- Africa's Talking Account ([africastalking.com](https://africastalking.com/)) with Sandbox or Live API Key

### 2. Database Setup via Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: chapaa_guard
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Start the database:
```bash
docker compose up -d
```

### 3. Backend Setup (FastAPI + Async SQLAlchemy)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Seed the database with 5 accredited schools/banks and 3 known fraud entities
python seed_db.py

# Start the FastAPI engine with Uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Exposing Africa's Talking Webhooks (ngrok)

```bash
ngrok http 8000
```
Copy the Forwarding URL (e.g. `https://your-domain.ngrok-free.app`) and configure it in your **Africa's Talking Sandbox Dashboard**:
- **SMS Callback URL**: `https://your-domain.ngrok-free.app/api/webhooks/at/incoming-sms`
- **Voice Callback URL**: `https://your-domain.ngrok-free.app/api/webhooks/at/voice-callback`

### 5. Running the Next.js Dashboard

```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The dashboard is a Next.js app. The fraud engine stays on FastAPI at port 8000.

---

## 🎯 Verification & Testing Scenarios

1. **Smishing Interception**: Forward or simulate test SMS:
   - *"Dear Parent, pay KES 14,500 Term 3 fees to Paybill 522123 Acc 0178 MARANDA."*
   - Observe automatic extraction of Paybill `522123`, cross-check against blacklist, 94% threat score, automated two-way warning SMS dispatch, and a Swahili outbound voice warning. When the call is answered, the voice callback returns XML that plays the warning.
2. **SIM Swap Check**: Open **SIM Swap** in the sidebar. Agree to the camera, enter a phone number, and start the check. A number ending in `999` is treated as a recent swap in sandbox mode. Capture an ID photo and a live selfie, type the 4-digit challenge, then enter the confirmation code. The request is marked completed in the database. The mobile network is not asked to swap the SIM.
3. **QoS Sentinel Telemetry**:
   - Inspect live hardware probe pings for `Infinix mobility X692-GL` (Changamwe) and `Samsung A55x` (Bamburi).
   - View latency sparklines and Communications Authority (CA) compliance metrics.
