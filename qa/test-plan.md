# Test Plan — Devenira

## 1. Scope

| Area | Pages / Features | Test Types |
|------|-----------------|------------|
| Landing page | `/` — Hero, Features, HowItWorks, Pricing, Testimonials, FAQ, Footer | Smoke, A11y, i18n |
| Auth — Login | `/login` — email/pw form, Google OAuth button | Smoke, Regression, A11y |
| Auth — Register | `/register` — form, 4 consent checkboxes, age guard | Smoke, Regression, A11y |
| Auth — Callback | `/auth/callback` — OAuth redirect handling | Regression |
| Auth — Onboarding | `/onboarding` — profile + goals wizard | Exploratory |
| Legal | `/terms`, `/privacy`, `/disclaimer` — content, nav, language switcher | Smoke |
| Dashboard — Home | `/home` — stats, feature cards, calorie chart | Smoke, Regression |
| Dashboard — Calories | `/calories` — date nav, food log form, meal list, trends | Regression |
| Dashboard — Food Camera | `/food-camera` — photo upload, AI analysis | Regression |
| Dashboard — Workouts | `/workouts` — exercise library, log form, delete confirm | Regression |
| Dashboard — Fasting | `/fasting` — protocol select, timer, history | Regression |
| Dashboard — Progress | `/progress` — weight log, goals, photo compare | Regression |
| Dashboard — Body Scan | `/body-scan` — 5 scan types, photo confirm, credits | Regression |
| Dashboard — Chat | `/chat` — AI coach, message input, clear history | Regression |
| Dashboard — Profile | `/profile` — edit form, credits, logout | Regression, A11y |
| Dashboard — Upgrade | `/upgrade` — plans, credit packs (no checkout click) | Smoke |
| API — Auth | 6 endpoints | API |
| API — Food | 8 endpoints | API |
| API — Workout | 7 endpoints | API |
| API — Body | 7 endpoints | API |
| API — Payments | 7 endpoints (observe only) | API |
| API — Dashboard | 3 endpoints | API |
| API — Weight | 6 endpoints | API |
| API — Chat | 4 endpoints | API |
| API — Notifications | 4 endpoints | API |
| API — Food Database | 5 endpoints | API |
| API — Food Decision | 4 endpoints | API |

## 2. Priority (Risk-Based)

### P0 — Critical (test first)
- Auth: register with consent validation, login, OAuth callback
- Middleware: unauthenticated redirect to `/login`
- Landing page renders (first impression)
- API: 401 on protected endpoints without token

### P1 — High
- Food logging (calories page) — core daily use
- Body scan — AI + credit consumption
- i18n switching — 10 languages across all pages
- Console errors / 5xx on page load

### P2 — Medium
- Workout logging and exercise library
- Weight tracking and goal projection
- Fasting timer and protocol selection
- Chat AI coach
- Form validation (all forms)

### P3 — Low
- Legal page content
- Profile display (non-edit)
- Upgrade page display (no checkout)
- Testimonials section accuracy

## 3. Out of Scope
- Payment execution (Stripe checkout, credit purchase)
- Account deletion
- External email sending (password reset delivery)
- Mobile app (RevenueCat)
- Production environment
- Load/performance testing (beyond page load time observation)

## 4. Test Types

| Type | Target Runtime | Trigger |
|------|---------------|---------|
| Smoke | < 10 min | Every deploy, PR merge |
| Regression | 30-60 min | Nightly, release candidate |
| API | < 10 min | Every deploy |
| Exploratory | Manual | Sprint boundary, new feature |
| A11y | < 5 min | Weekly, component changes |

## 5. Environment

- Local dev: `http://localhost:3000` (frontend), `http://localhost:8000` (backend)
- Backend OpenAPI docs: `http://localhost:8000/docs`
- Test user: created via API with all consent flags = true
- AI calls: will incur real API costs — limit to 1-2 per feature verification
