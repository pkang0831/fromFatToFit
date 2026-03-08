# QA Findings — Devenira

> Findings accumulated during browser-based QA testing on 2026-02-26.
> Environment: local dev (localhost:3000 frontend, localhost:8000 backend)

## Severity Definitions
- **Blocking**: App unusable, data loss, security issue
- **Major**: Key feature broken, poor UX, incorrect data
- **Minor**: Cosmetic, edge case, non-critical inconsistency

---

## Summary Table

| ID | Severity | Priority | Page | Summary | Repro Rate |
|----|----------|----------|------|---------|------------|
| F-001 | Major | P1 | Middleware | `/fasting` and `/chat` not server-side protected | 3/3 |
| F-002 | Minor | P2 | Login | "or continue with" text not translated (i18n gap) | 3/3 |
| F-003 | Minor | P3 | Landing | Footer copyright "All rights reserved." not translated | 3/3 |
| F-004 | Minor | P3 | All pages | Hydration warning: `data-cursor-ref` extra attribute on FooterSection h3 | 3/3 |
| F-005 | Major | P1 | Backend | `/docs` (OpenAPI) returns 404 — ENVIRONMENT=production in .env | 3/3 |
| F-006 | Minor | P2 | `/chat` | Unauthenticated access shows "Loading..." for ~2-3 seconds before client redirect | 3/3 |
| F-007 | Minor | P3 | `<title>` | Page title is "Health & Wellness App" not "Devenira" — branding mismatch | 3/3 |

---

## Detailed Findings

### F-001: Middleware gap — `/fasting` and `/chat` not server-side protected

- **Severity**: Major
- **Priority**: P1
- **Environment**: localhost:3000
- **Repro Steps**:
  1. Clear all cookies/tokens
  2. Navigate to `http://localhost:3000/fasting`
  3. Observe: page loads briefly before client-side redirect
  4. Navigate to `http://localhost:3000/chat`
  5. Observe: shows "Loading..." for 2-3 seconds before redirect
- **Expected**: Middleware redirects to `/login` immediately (server-side, no flash)
- **Actual**: Middleware does not intercept; relies on client-side `AuthProvider` redirect
- **Evidence**: `/fasting` shows "Redirecting to login..." text; `/chat` shows "Loading..." text
- **Root Cause**: `middleware.ts` `isDashboardPage` check does not include `/fasting` or `/chat`
- **Suggested Fix**: Add `pathname.startsWith('/fasting') || pathname.startsWith('/chat')` to `isDashboardPage`
- **Repro Rate**: 3/3

### F-002: "or continue with" not translated

- **Severity**: Minor
- **Priority**: P2
- **Environment**: localhost:3000/login, language set to Korean
- **Repro Steps**:
  1. Set language to Korean via language switcher
  2. Navigate to `/login`
  3. Scroll to social login section
- **Expected**: "or continue with" translated to Korean ("또는 다음으로 계속")
- **Actual**: Text remains "or continue with" in English
- **Evidence**: Screenshot `qa/evidence/login-page-initial.png`
- **Root Cause**: `SocialLoginButtons.tsx` uses hardcoded "or continue with" string, not `t('auth.orContinueWith')`
- **Suggested Fix**: Replace hardcoded string with `t('auth.orContinueWith')` in SocialLoginButtons component
- **Repro Rate**: 3/3

### F-003: Footer copyright "All rights reserved." not translated

- **Severity**: Minor
- **Priority**: P3
- **Environment**: localhost:3000, language set to Korean
- **Repro Steps**:
  1. Set language to Korean
  2. Scroll to footer
  3. Check copyright line
- **Expected**: Entire copyright line in Korean
- **Actual**: Shows "© 2026 Devenira . All rights reserved." (English)
- **Root Cause**: Footer component may not apply `t('legal.allRightsReserved')` to this specific text
- **Repro Rate**: 3/3

### F-004: Hydration warning — `data-cursor-ref` extra attribute

- **Severity**: Minor
- **Priority**: P3
- **Environment**: localhost:3000 (dev mode console)
- **Repro Steps**:
  1. Open browser console
  2. Navigate to landing page
  3. Check console warnings
- **Expected**: No hydration warnings
- **Actual**: Warning about extra `data-cursor-ref` attribute from server on FooterSection h3
- **Root Cause**: Browser automation tooling injects `data-cursor-ref` attributes; SSR/client mismatch
- **Note**: Dev-only warning, does not affect production. Non-actionable.
- **Repro Rate**: 3/3 (automation environment only)

### F-005: OpenAPI docs disabled — ENVIRONMENT=production

- **Severity**: Major
- **Priority**: P1
- **Environment**: localhost:8000
- **Repro Steps**:
  1. `curl http://localhost:8000/docs`
  2. Returns 404
- **Expected**: OpenAPI docs available in local development
- **Actual**: 404 because `.env` sets `ENVIRONMENT=production`
- **Root Cause**: `backend/.env` line 23: `ENVIRONMENT=production`. This disables `/docs` and `/redoc`.
- **Suggested Fix**: Set `ENVIRONMENT=development` in local `.env` (or `.env.local` override)
- **Repro Rate**: 3/3

### F-006: `/chat` shows "Loading..." before redirect for unauthenticated users

- **Severity**: Minor
- **Priority**: P2
- **Environment**: localhost:3000/chat, no auth token
- **Repro Steps**:
  1. Clear cookies
  2. Navigate to `/chat`
  3. Observe "Loading..." for 2-3 seconds
  4. Eventually redirects to `/login`
- **Expected**: Immediate redirect (server-side via middleware)
- **Actual**: Shows layout + "Loading..." spinner for 2-3 seconds before client-side redirect
- **Root Cause**: Same as F-001 — middleware gap
- **Repro Rate**: 3/3

### F-007: HTML title "Health & Wellness App" instead of "Devenira"

- **Severity**: Minor
- **Priority**: P3
- **Environment**: All pages
- **Repro Steps**:
  1. Navigate to any page
  2. Check browser tab title
- **Expected**: "Devenira" or page-specific title
- **Actual**: "Health & Wellness App"
- **Root Cause**: `frontend/src/app/layout.tsx` metadata sets `title: 'Health & Wellness App'`
- **Suggested Fix**: Change to `title: 'Devenira'` in root layout metadata
- **Repro Rate**: 3/3

---

## API QA Results

### Positive Findings (working correctly)
- All 6 tested protected endpoints return 401 without auth token
- Registration consent validation: returns 400 with clear message when consent flags are false
- Registration age check: returns 400 with clear message when age < 18
- Health endpoint returns valid JSON: `{"status":"healthy","environment":"production","version":"1.0.0"}`
- Food database search (public) returns valid paginated results with proper schema
- All rate-limited endpoints have rate limit decorators applied

### API Issues
- OpenAPI docs disabled (see F-005)
- No CORS issues observed on localhost
- No 5xx errors observed during testing
