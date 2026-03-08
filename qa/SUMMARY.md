# QA Summary Report — Devenira

> Generated: 2026-02-26
> Environment: local dev (localhost:3000 + localhost:8000)
> Test Framework: Playwright 1.58.2

---

## Test Execution Results

| Suite | Tests | Passed | Failed | Flaky | Duration |
|-------|-------|--------|--------|-------|----------|
| API (@api) | 26 | 26 | 0 | 0 | 1.8s |
| E2E Smoke (@smoke) | 20 | 19 | 0 | 1 | 25.1s |
| **Total** | **46** | **45** | **0** | **1** | **~27s** |

---

## Top 5 Most Critical Issues

| Rank | ID | Severity | Summary | Impact |
|------|----|----------|---------|--------|
| 1 | F-001 | Major | `/fasting` and `/chat` not server-side protected by middleware | Security: unauthenticated users can briefly see dashboard layout before client redirect |
| 2 | F-005 | Major | `ENVIRONMENT=production` in local .env disables OpenAPI docs | Dev productivity: cannot use /docs for API testing locally |
| 3 | F-007 | Minor | HTML title "Health & Wellness App" instead of "Devenira" | Branding: SEO and user-facing title is wrong |
| 4 | F-002 | Minor | "or continue with" text not translated (i18n gap) | UX: inconsistent language on login/register pages |
| 5 | F-003 | Minor | Footer copyright "All rights reserved." not translated | UX: minor i18n inconsistency in footer |

## Top 5 Easiest to Reproduce

| Rank | ID | Repro Rate | Repro Steps |
|------|----|------------|-------------|
| 1 | F-007 | 3/3 | Open any page, check browser tab title |
| 2 | F-005 | 3/3 | `curl http://localhost:8000/docs` → 404 |
| 3 | F-001 | 3/3 | Clear cookies → navigate to `/fasting` → see flash before redirect |
| 4 | F-002 | 3/3 | Set Korean → `/login` → scroll to social login section |
| 5 | F-003 | 3/3 | Set Korean → scroll to footer → check copyright text |

## Top 10 Regression Risks (Automate These)

| Rank | Risk | Current Test | Priority |
|------|------|-------------|----------|
| 1 | Auth: 401 on all protected endpoints without token | API test: 16 endpoints ✅ | Critical |
| 2 | Auth: consent validation rejects false flags | API test ✅ | Critical |
| 3 | Auth: age < 18 rejected | API test ✅ | Critical |
| 4 | Middleware: dashboard routes redirect to /login | E2E test: 5 routes ✅ | Critical |
| 5 | Landing page: all sections render | E2E test ✅ | High |
| 6 | i18n: language switching EN/KO roundtrip | E2E test ✅ | High |
| 7 | Legal pages: Terms/Privacy/Disclaimer render with headers | E2E test ✅ | High |
| 8 | Register: 4 consent checkboxes present and required | E2E test ✅ | High |
| 9 | Login: form renders, Google button exists | E2E test ✅ | Medium |
| 10 | No 5xx on public page loads | E2E test ✅ | Medium |

---

## Automation Assets Delivered

### Files Created

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Playwright config with chromium + API projects, webServer, trace/screenshot on failure |
| `tests/e2e/smoke.spec.ts` | 20 smoke tests: landing, login, register, legal, i18n, middleware |
| `tests/api/health.spec.ts` | 26 API tests: health, auth validation, 16 protected endpoints, food DB schema |
| `qa/test-plan.md` | Risk-prioritized test plan with scope, types, priorities |
| `qa/coverage-map.md` | Route inventory with SAFE/RISKY element classification |
| `qa/findings.md` | 7 findings with full repro steps, evidence, root cause, fix suggestions |
| `qa/api-inventory.md` | 63 endpoints documented with auth, rate limits, risk levels |
| `qa/runbook.md` | Local setup, test commands, env vars, troubleshooting |
| `qa/SUMMARY.md` | This summary report |

### data-testid Attributes Added

| Component | Test IDs |
|-----------|----------|
| Login page | `login-email`, `login-password`, `login-submit`, `login-google`, `login-register-link` |
| Register page | `register-email`, `register-password`, `register-submit`, `consent-terms`, `consent-privacy`, `consent-sensitive`, `consent-age` |
| HeroSection | `hero-cta`, `hero-signin` |
| LanguageSwitcher | `lang-switcher` |

### Running Tests

```bash
# All tests
npm test

# Smoke only (< 30s)
npm run test:smoke

# API only (< 2s)
npm run test:api

# View HTML report
npm run test:report
```

---

## Positive Findings (Working Correctly)

- All 16 tested protected API endpoints correctly return 401 without auth
- Consent validation: rejects registration when any consent flag is false
- Age validation: rejects registration when age < 18
- Food database (public): returns valid paginated results with proper schema
- Health endpoint: returns valid JSON with status, environment, version
- Landing page: all 7 sections render correctly
- i18n: Korean translation works across landing, login, register, legal pages
- Language switcher: 10 languages displayed, switching persists via localStorage
- FAQ accordion: opens/closes correctly
- Footer links: navigate to correct legal pages
- Legal pages: all 3 render full content with navigation header
- Middleware: server-side redirect works for /home, /calories, /body-scan (and 5 more)
- Google OAuth: redirects to accounts.google.com correctly
- No 5xx errors observed on any page or API endpoint
- No CORS issues observed
- No fatal console errors on any page
