# AgriShield Backend (Developer 1: Backend & API Engineer)

USSD + SMS parametric crop insurance backend. Farmers interact only through
`*384*123#` (USSD) and SMS — no app, no smartphone, no paperwork.

## Stack

- Node.js + Express
- MongoDB (Mongoose)
- Africa's Talking (USSD + SMS) — with a **mock mode** so the demo works without live credentials
- Open-Meteo (free weather API, no key required)
- node-cron for scheduled rainfall polling

## 1. Setup

```bash
cd agrishield-backend
npm install
cp .env.example .env
```

Edit `.env`:
- Leave `MOCK_AFRICAS_TALKING=true` if you don't have Africa's Talking sandbox
  credentials yet — SMS sends will be logged to the console instead of failing.
- Set `MONGO_URI` to a local `mongodb://localhost:27017/agrishield` or an Atlas
  connection string.

Start MongoDB locally (or use Atlas), then:

```bash
npm run seed   # creates 3 demo farmers in Machakos & Kitui with active policies
npm start      # or `npm run dev` with nodemon
```

Server boots on `http://localhost:3000`. Health check: `GET /health`.

## 2. USSD flow

Callback URL to register in the Africa's Talking dashboard (Sandbox → USSD →
Create Channel): `POST http://<your-host>/ussd`

Menu:
```
CON Welcome to AgriShield
1. Register
2. My Insurance Policy
3. Check Weather Risk
4. Payout History
5. Help
```

Registration is a 4-step dial flow: name → county → crop type → farm size.
On completion it creates a `Farmer` + an `Active` `Policy` (flat KES 15,000
coverage for the MVP) and sends a welcome SMS.

Test locally without a real USSD gateway using curl (mimics an Africa's
Talking POST):

```bash
curl -X POST http://localhost:3000/ussd \
  -d "sessionId=1" -d "phoneNumber=+254700000001" -d "serviceCode=*384*123#" -d "text="

curl -X POST http://localhost:3000/ussd \
  -d "sessionId=1" -d "phoneNumber=+254700000001" -d "serviceCode=*384*123#" -d "text=1"

curl -X POST http://localhost:3000/ussd \
  -d "sessionId=1" -d "phoneNumber=+254700000001" -d "serviceCode=*384*123#" -d "text=1*Jane Wanjiku"

curl -X POST http://localhost:3000/ussd \
  -d "sessionId=1" -d "phoneNumber=+254700000001" -d "serviceCode=*384*123#" -d "text=1*Jane Wanjiku*Machakos"

curl -X POST http://localhost:3000/ussd \
  -d "sessionId=1" -d "phoneNumber=+254700000001" -d "serviceCode=*384*123#" -d "text=1*Jane Wanjiku*Machakos*Maize"

curl -X POST http://localhost:3000/ussd \
  -d "sessionId=1" -d "phoneNumber=+254700000001" -d "serviceCode=*384*123#" -d "text=1*Jane Wanjiku*Machakos*Maize*2"
```

## 3. SMS

Uses the Africa's Talking SMS API (or mock/console fallback). Webhooks:
- `POST /sms/delivery-report` — delivery report callback
- `POST /sms/inbound` — inbound SMS callback
- `POST /sms/send-test` — manual test send: `{ "to": "+254...", "message": "..." }`

## 4. Weather integration

`services/weatherService.js` calls Open-Meteo's Archive API (no key) for a
30-day rolling rainfall total and consecutive dry-day count per farmer
county. A cron job (`WEATHER_POLL_CRON`, default every 6 hours) polls all
counties with registered farmers, stores a `WeatherRecord`, sends an early
warning SMS if rainfall is trending low, and runs the drought engine.

Trigger a poll manually: `POST /api/weather/poll-now`

## 5. Drought rule engine

`services/droughtEngine.js`:

```
IF rainfall < 20mm (RAINFALL_THRESHOLD_MM)
FOR 30 consecutive dry days (DROUGHT_WINDOW_DAYS)
THEN trigger payout
```

Compensation scales from 50%–100% of coverage based on rainfall deficit
severity, capped at the policy's `coverageAmount`. On trigger: policy status
→ `Triggered`, a `Payout` record is created, and an SMS is sent.

## 6. Admin dashboard API (for Developer 2 / React frontend)

| Endpoint | Description |
|---|---|
| `GET /api/demo/overview` | Total farmers, active policies, policies triggered, total compensation paid |
| `GET /api/farmers` | All farmers + their policy |
| `GET /api/farmers/:id` | Single farmer detail |
| `POST /api/farmers` | Manual registration (admin convenience) |
| `GET /api/weather` | Latest rainfall/risk per county |
| `GET /api/weather/:county/history` | Rainfall history for a county |
| `GET /api/payouts` | All payouts with farmer + policy populated |
| `GET /api/payouts/summary` | Payout totals |

## 7. Demo Mode — "SIMULATE DROUGHT" button

This is what the frontend's big red button calls. **One request does
everything** required by the judging criteria in under a second:

```
POST /api/demo/simulate-drought
Body (optional): { "county": "Machakos" }
```

It will:
1. Insert a `WeatherRecord` with rainfall forced below threshold (`simulated: true`)
2. Run the drought engine for that county
3. Create a `Payout` and flip the matching `Policy` to `Triggered`
4. Send the payout SMS (mocked or real)
5. Return the updated payout + weather data for the dashboard to render

Reset the demo between runs (keeps real farmers, clears simulated data):
```
POST /api/demo/reset
```

## 8. Database schema

- **Farmer**: name, phoneNumber (unique), county, latitude, longitude, cropType, farmSize
- **Policy**: farmerId, coverageAmount, rainfallThreshold, status (Active/Triggered/Paid/Lapsed)
- **WeatherRecord**: county, latitude, longitude, rainfallAmount, consecutiveDryDays, recordDate, simulated
- **Payout**: policyId, farmerId, amount, status, triggerReason, dateTriggered, notificationStatus

## 9. Deployment (fastest path for a hackathon)

1. **MongoDB**: use a free MongoDB Atlas cluster → copy connection string into `MONGO_URI`.
2. **Backend host**: Render, Railway, or Fly.io (free tiers). Push this repo,
   set env vars from `.env.example`, deploy. Note the public HTTPS URL.
3. **Africa's Talking**: Sandbox app → USSD channel → set callback to
   `https://<your-public-url>/ussd`. SMS works out of the box with sandbox
   credentials (test phone numbers only) or go live for real numbers.
4. If you run out of setup time before judging, keep `MOCK_AFRICAS_TALKING=true`
   — the entire flow (USSD, drought trigger, "SMS") still works and is
   visible in server logs / the dashboard, it just doesn't hit the real
   Africa's Talking API.

## 10. Testing without live USSD/SMS credentials

- `npm run seed` for demo farmers.
- Use the curl sequence in section 2 to walk through registration.
- Call `POST /api/demo/simulate-drought` to trigger a full payout end-to-end.
- Check console logs for `[MOCK SMS]` output confirming each notification.
