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

The QoS map and canary devices in the console are sample data. The live demo path is the scam SMS score, the Swahili warning, and the SIM swap face check.

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- An Africa's Talking sandbox account if you want a real SMS and call. With no API key, those steps stay on this machine.

### 2. Backend (FastAPI, SQLite by default)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp .env.example .env
# Put your sandbox key in AT_API_KEY. Leave AT_SENDER_ID empty.

# Optional: seed accredited schools/banks and known fraud Paybills
python -m backend.seed_db

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The API creates `chapaa_guard.db` in the working directory. Set `DATABASE_URL` only if you want Postgres.

### 3. Africa's Talking callbacks

```bash
ngrok http 8000
```

Point the sandbox dashboard at the ngrok host, not the Next.js port:
- SMS callback: `https://your-domain.ngrok-free.app/api/webhooks/at/incoming-sms`
- Voice callback: `https://your-domain.ngrok-free.app/api/webhooks/at/voice-callback`

Set `SERVER_BASE_URL` in `.env` to that same ngrok URL and restart the API. `GET /api/health` reports `at_mode: live` when the key loaded, and `simulator` when it did not.

### 4. Next.js dashboard

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The fraud engine stays on port 8000.

---

## 🎯 Demo path

1. **Scam SMS.** On the dashboard, run the Maranda fee message. Paybill `522123` scores as a school-fee scam. With a sandbox key, Simulate Attack sends the warning SMS and places the Swahili call. Without a key, the screen says the score stayed local.
2. **SIM swap.** Open **SIM Swap**. A number ending in `999` is a recent swap while `at_mode` is `simulator`. Capture an ID photo and a live selfie in similar light, type the 4-digit number, then the confirmation code. This records the check. It does not ask a mobile network to swap the SIM.
3. **QoS and canaries** are labeled Demo. Use them as a second slide, not the proof that Africa's Talking is connected.
