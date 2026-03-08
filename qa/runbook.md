# QA Runbook — Devenira

## 1. Local Environment Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm / pip

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local — set:
#   NEXT_PUBLIC_API_URL=http://localhost:8000/api
#   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
npm install
npm run dev
# Runs on http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — set Supabase, OpenAI, and other API keys
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Runs on http://localhost:8000
# OpenAPI docs: http://localhost:8000/docs
```

### Common Issues

| Issue | Fix |
|-------|-----|
| `.next` cache corruption (404s, blank page) | `rm -rf frontend/.next && npm run dev` |
| Port already in use | `lsof -ti :3000 \| xargs kill -9` |
| Supabase "Invalid API key" | Upgrade supabase lib: `pip install --upgrade supabase` |
| Backend import errors | Ensure venv activated: `source venv/bin/activate` |

## 2. Test Execution

### Smoke Tests (< 10 min)

```bash
cd frontend  # or project root if tests are there
npx playwright test --project=chromium --grep @smoke
```

### Regression Tests (30-60 min)

```bash
npx playwright test --project=chromium --grep @regression
```

### API Tests (< 10 min)

```bash
npx playwright test --project=api --grep @api
```

### All Tests

```bash
npx playwright test
```

### View Report

```bash
npx playwright show-report
```

## 3. Test User Creation

### Via API (recommended for automation)

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-test@devenira.test",
    "password": "TestPass123!",
    "full_name": "QA Test User",
    "gender": "male",
    "age": 25,
    "height_cm": 175,
    "weight_kg": 75,
    "ethnicity": "Asian",
    "activity_level": "moderate",
    "consent_terms": true,
    "consent_privacy": true,
    "consent_sensitive_data": true,
    "consent_age_verification": true
  }'
```

### Via Google OAuth
1. Navigate to `/login`
2. Click "Google" button
3. Complete Google sign-in flow
4. Should redirect to `/auth/callback` then `/home`

## 4. Environment Variables

### Frontend (.env.local)

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8000/api` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | `sb_publishable_xxx` |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | `pk_test_xxx` |

### Backend (.env)

| Variable | Required | Example |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Yes | `sb_secret_xxx` |
| `SUPABASE_ANON_KEY` | Yes | `sb_publishable_xxx` |
| `OPENAI_API_KEY` | Yes | `sk-proj-xxx` |
| `ENVIRONMENT` | No | `development` |
| `AI_PROVIDER` | No | `openai` |

## 5. Troubleshooting

### Frontend won't start
1. Delete `.next` cache: `rm -rf .next`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check Node version: `node --version` (needs 18+)

### Backend won't start
1. Check Python version: `python --version` (needs 3.11+)
2. Activate venv: `source venv/bin/activate`
3. Reinstall deps: `pip install -r requirements.txt`
4. Check `.env` file exists and has valid Supabase keys

### Tests fail with timeout
1. Ensure both frontend and backend are running
2. Increase timeout in `playwright.config.ts`
3. Check for port conflicts

### Flaky tests
1. Check `qa/findings.md` for known flakes
2. Add `test.retry(2)` for known unstable tests
3. Use `--trace on` to capture traces for debugging
