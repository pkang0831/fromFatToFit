# Deployment Guide — Devenira

## Frontend (Vercel)

### 1. Connect Repository
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import `pkang0831/devenira`
3. Set **Root Directory** to `frontend`
4. Framework: **Next.js** (auto-detected)

### 2. Environment Variables
Set these in Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.com/api` | Backend API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rstsbnkemgeqhrxerksn.supabase.co` | Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | `https://devenira.com` | Your custom domain |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe publishable key |

### 3. Custom Domain
1. Vercel Dashboard > Project > Settings > Domains
2. Add `devenira.com`
3. Update DNS records at your registrar:
   - `A` record: `76.76.21.21`
   - `CNAME` for `www`: `cname.vercel-dns.com`

### 4. Deploy
Push to `main` branch — Vercel auto-deploys.

---

## Backend (Railway / Render / Fly.io)

### Option A: Railway
1. Go to [railway.app](https://railway.app)
2. New Project > Deploy from GitHub
3. Select `devenira`, set **Root Directory** to `backend`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (see below)

### Option B: Render
1. Go to [render.com](https://render.com)
2. New Web Service > Connect repo
3. Root: `backend`, Build: `pip install -r requirements.txt`
4. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Backend Environment Variables

| Variable | Notes |
|----------|-------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `SUPABASE_ANON_KEY` | Anon key |
| `OPENAI_API_KEY` | OpenAI API key |
| `GEMINI_API_KEY` | Google Gemini key |
| `ANTHROPIC_API_KEY` | Anthropic Claude key |
| `REPLICATE_API_KEY` | Replicate key |
| `STRIPE_SECRET_KEY` | `sk_live_...` (production) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe Dashboard |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` | `https://devenira.com,https://www.devenira.com` |
| `AI_PROVIDER` | `hybrid` (recommended) |

---

## Post-Deploy Checklist

- [ ] Frontend loads at custom domain
- [ ] API health check: `curl https://api.devenira.com/health`
- [ ] Google OAuth callback URL updated in Supabase: `https://devenira.com/auth/callback`
- [ ] Stripe webhook endpoint set: `https://api.devenira.com/api/payments/webhook`
- [ ] CORS origins set to production domain
- [ ] `ENVIRONMENT=production` (disables /docs)
- [ ] SSL/HTTPS working on both frontend and backend
- [ ] Test: register, login, food scan, body scan, payment flow
