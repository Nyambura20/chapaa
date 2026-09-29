# SIM Shield (working title)

A Next.js platform, built on Africa's Talking, that helps mobile users in Kenya protect themselves from SMS scams and SIM swap fraud.

It has two features:

1. **Spam Message Checker**: the user pastes a suspicious message as **text**. The platform runs a background check and sends the verdict back by **SMS or phone call**, whichever the user prefers.
2. **SIM Swap with KYC**: a SIM swap request is only approved after the user passes a **webcam KYC check**. A confirmation is then sent by **SMS, call, or WhatsApp**.

> **Scope note:** This is a prototype. The platform cannot perform a real SIM swap, because only the telco can. The "swap completed" step is simulated in the database. The KYC step is a demo of face matching plus liveness, not a legal identity verification system.

---

## 1. Features in detail

### 1.1 Spam Message Checker (text only, no image upload)

- The user pastes a message into a text box. There is no screenshot upload and no OCR.
- The backend extracts links, phone numbers, Paybill/Till numbers, amounts and sender ID from the text.
- Checks run in this order:
  1. **Rules:** patterns for common scams (wrong M-Pesa transaction, fake job or loan fee, prize wins, "account will be blocked", requests for PIN/OTP/ID number). A request for a PIN or OTP is the strongest red flag.
  2. **Reported-entity lookup:** numbers, Paybills and links already reported by other users (own database).
  3. **Link reputation** (optional): Google Safe Browsing and/or VirusTotal.
  4. **LLM classifier:** returns strict JSON with a verdict, confidence and reasons.
- The results are combined into one verdict: `LIKELY_SCAM`, `SUSPICIOUS` or `NO_RED_FLAGS_FOUND`.
- Never call a message "safe" or "legit". `NO_RED_FLAGS_FOUND` always carries the advice to confirm with the sender through an official channel.
- The verdict is delivered by SMS or voice call, according to the user's preference.

### 1.2 SIM Swap with KYC

1. The user enters their phone number and starts a swap request.
2. The backend runs the Africa's Talking **SIM swap check** on that number. A recent swap raises the risk level.
3. The browser opens the webcam and captures an **ID photo** and a **live selfie**.
4. The face-match service compares the two faces and returns a similarity score. A **liveness challenge** (for example, turn your head left, or read a random 4-digit number) must also pass.
5. If the score is above the threshold and liveness passed, a confirmation with a **one-time code** is sent by the user's chosen channel (SMS, call or WhatsApp).
6. The user enters the code. The request is marked `COMPLETED` (simulated) and written to the audit log.

Images are used only for the match and are **deleted immediately afterwards**. Only the score, result and timestamps are stored.

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Route Handlers for the API and webhooks |
| UI | Tailwind CSS + shadcn/ui | Fast to build |
| Database | **PostgreSQL** via **Supabase** or **Neon** | Free tiers exist; check current limits |
| ORM | **Prisma** (or Drizzle) | Migrations and type safety |
| Telecom | **Africa's Talking** (Node SDK) | SMS, Voice, Insights (SIM swap), WhatsApp |
| Spam LLM | Anthropic API | Model name set through an env var |
| Face match | **Python FastAPI + DeepFace** microservice | Runs separately (Render, Railway or Fly) |
| Auth | Phone number + SMS one-time code | Uses the same SMS service |
| Hosting | Vercel (app) + a small host for the face service | The app needs a public HTTPS URL for webhooks |

### Why PostgreSQL

- The data is relational: users, requests, reports, notifications and audit logs all link to each other.
- Reported scam numbers and links need fast lookups and unique constraints, which Postgres handles well.
- SQLite is **not** suitable if you deploy on Vercel, because serverless functions do not keep local files.

### Why a separate face-match service

Face models are heavy for serverless functions. A small Python service keeps the Next.js app light. Running the match on the server also avoids trusting a result computed in the user's browser, which can be tampered with.

---

## 3. Architecture

```
Browser (Next.js UI)
   |  paste text / webcam capture
   v
Next.js Route Handlers  ---->  PostgreSQL (Prisma)
   |        |        |
   |        |        +--> Face service (FastAPI + DeepFace)
   |        +-----------> LLM API (spam classification)
   v
Africa's Talking  <----  webhooks (voice callback, SIM swap status)
   |
   v
User's phone (SMS / call / WhatsApp)
```

---

## 4. Suggested folder structure

```
/app
  /(auth)/login/page.tsx
  /spam-check/page.tsx
  /sim-swap/page.tsx
  /dashboard/page.tsx
  /api
    /auth/request-otp/route.ts
    /auth/verify-otp/route.ts
    /spam-check/route.ts
    /sim-swap/start/route.ts
    /sim-swap/kyc/route.ts
    /sim-swap/confirm/route.ts
    /voice/callback/route.ts
    /sim-swap/status/route.ts        # Africa's Talking webhook
/lib
  /africastalking.ts                 # SDK init + notify()
  /spam
    extract.ts                       # links, numbers, paybills
    rules.ts                         # scam patterns
    linkcheck.ts                     # Safe Browsing / VirusTotal
    classify.ts                      # LLM call, JSON output
    score.ts                         # combine into a verdict
  /kyc
    faceService.ts                   # calls the FastAPI service
    liveness.ts                      # challenge generation/validation
  /db.ts                             # Prisma client
/prisma/schema.prisma
/face-service                        # Python FastAPI project
```

---

## 5. Data model

| Table | Key columns |
|---|---|
| `users` | id, phone (unique, E.164), preferred_channel (`sms`/`call`/`whatsapp`), language (`en`/`sw`), consent_at, created_at |
| `otp_codes` | id, phone, code_hash, expires_at, used_at |
| `spam_checks` | id, user_id, message_text, extracted (json), verdict, score, reasons (json), channel, created_at |
| `reported_entities` | id, type (`phone`/`paybill`/`till`/`url`), value (unique per type), report_count, first_seen, last_seen |
| `sim_swap_requests` | id, user_id, phone, swap_check_status, risk_level, kyc_status, status (`PENDING`/`KYC_PASSED`/`CODE_SENT`/`COMPLETED`/`REJECTED`), created_at |
| `kyc_attempts` | id, request_id, similarity_score, liveness_passed, result, created_at (no images stored) |
| `confirmation_codes` | id, request_id, code_hash, channel, expires_at, used_at |
| `notifications` | id, user_id, channel, type, provider_ref, status, created_at |
| `audit_logs` | id, actor, action, entity, entity_id, metadata (json), created_at |

Store one-time codes as **hashes**, and set short expiry times.

---

## 6. API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/request-otp` | POST | Send a login code by SMS |
| `/api/auth/verify-otp` | POST | Verify the code and start a session |
| `/api/spam-check` | POST | Body: `{ message }`. Run checks, store, deliver the verdict |
| `/api/sim-swap/start` | POST | Create a request, run the SIM swap check |
| `/api/sim-swap/kyc` | POST | Receive the ID photo, selfie and liveness data; call the face service |
| `/api/sim-swap/confirm` | POST | Verify the one-time code and complete the request |
| `/api/voice/callback` | POST | Africa's Talking voice webhook; returns Voice XML with the spoken verdict |
| `/api/sim-swap/status` | POST | Webhook for asynchronous SIM swap check results |

---

## 7. Africa's Talking integration

Install: `npm install africastalking`

```ts
// lib/africastalking.ts
import AfricasTalking from "africastalking";

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!, // "sandbox" for development
});

export const sms = at.SMS;
export const voice = at.VOICE;
export const insights = at.INSIGHTS;
export const whatsapp = at.WHATSAPP;

export async function notify(
  phone: string,
  channel: "sms" | "call" | "whatsapp",
  text: string
) {
  if (channel === "sms") {
    return sms.send({ to: [phone], message: text });
  }
  if (channel === "call") {
    // The spoken text is served later by /api/voice/callback
    await savePendingVoiceMessage(phone, text);
    return voice.call({ callFrom: process.env.AT_VOICE_NUMBER!, callTo: [phone] });
  }
  // WhatsApp: check the WhatsApp docs for the exact payload and account setup
}
```

Notes:

- The SDK exposes SMS, Voice, Insights and WhatsApp services. The Insights service includes `checkSimSwapState([phoneNumbers])`.
- The SIM swap check has separate sandbox and live endpoints. Sandbox results should be treated as mock data, and real swap data probably needs a live account.
- **Voice:** `call` only places the call. When the user answers, Africa's Talking POSTs to your callback URL and you reply with Voice XML actions (for example `Say`, `GetDigits`). Confirm the exact field names and XML format in the official Voice docs.
- **WhatsApp** may need extra account approval. Check this early.
- Test whether the `Say` action can read Swahili well. If not, use Swahili SMS with English voice.
- Method signatures above are from SDK listings and should be verified against the official docs.

---

## 8. Spam classifier contract

Ask the model for **JSON only**, and validate it with a schema (for example Zod) before use.

```json
{
  "verdict": "LIKELY_SCAM | SUSPICIOUS | NO_RED_FLAGS_FOUND",
  "confidence": 0.0,
  "red_flags": ["asks for PIN", "urgent deadline", "unknown paybill"],
  "advice": "One short action for the user"
}
```

Combine this with the rule score and reported-entity hits. Any single strong signal (PIN/OTP request, a reported number, a link flagged by Safe Browsing) should raise the final verdict.

SMS template (English):

```
SIM Shield: LIKELY SCAM. It asks for your PIN. Do not reply or click. Report it to your network's fraud line.
```

Check the current official reporting short code for your network before adding one.

---

## 9. Environment variables

```
DATABASE_URL=
AT_USERNAME=sandbox
AT_API_KEY=
AT_VOICE_NUMBER=
AT_SENDER_ID=
ANTHROPIC_API_KEY=
LLM_MODEL=
SAFE_BROWSING_API_KEY=
FACE_SERVICE_URL=
FACE_SERVICE_SECRET=
SESSION_SECRET=
APP_BASE_URL=
```

All keys stay **server-side only**. Never prefix them with `NEXT_PUBLIC_`.

---

## 10. Security and privacy

- **Consent:** show a clear consent screen before the webcam opens.
- **Biometric data is sensitive** under Kenya's Data Protection Act. Keep images in memory only, delete them right after matching, and store only the score and result.
- **Liveness:** matching alone is easy to beat with a photo. Use a random challenge and capture several frames.
- **Confirmation channel:** in a real swap, do not send the code only to the SIM being replaced. For the demo, send an alert to the current number and the code to the WhatsApp or alternate channel.
- Rate-limit OTP, spam-check and KYC endpoints per phone number and IP.
- Hash OTPs and confirmation codes, and expire them quickly.
- Protect the face service with a shared secret, and keep it off the public internet if possible.
- Keep an audit log entry for every KYC decision and every notification sent.
- Use volunteers for demos, and never store real ID documents.

---

## 11. Build order

1. Project setup: Next.js, Tailwind, Prisma, Postgres, env variables.
2. Phone OTP login using Africa's Talking SMS in the sandbox.
3. `notify()` helper with SMS, then voice with a callback (use ngrok locally).
4. Spam checker: extraction, rules, reported-entity lookup, then the LLM classifier.
5. Spam verdict delivery by SMS and call.
6. SIM swap check integration.
7. Face-service microservice, then webcam capture in the browser.
8. Liveness challenge and score threshold.
9. Confirmation code flow and the simulated `COMPLETED` state.
10. Dashboard with history and audit log.
11. WhatsApp channel, once account access is confirmed.

---

## 12. Known limitations

- Sandbox SMS and voice do not reach real phones as production would.
- SIM swap results in the sandbox are not real telco data.
- WhatsApp needs account setup that has not been verified yet.
- The face match and liveness are demo-grade, not a certified KYC solution.
- The spam checker can miss new scams. Its output is guidance, not proof.
