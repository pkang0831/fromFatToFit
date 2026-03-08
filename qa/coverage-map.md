# Coverage Map — Devenira

## Route Inventory

### Public (no auth required)

| Route | Layout | Elements | Status |
|-------|--------|----------|--------|
| `/` | Root | 20+ interactive (links, buttons, accordion, lang switcher) | Pending |
| `/login` | Auth | 5 (email, password, submit, create link, Google) | Pending |
| `/register` | Auth | 20+ (form fields, selects, 4 checkboxes, submit, sign-in link, Google) | Pending |
| `/terms` | Legal | 8 (nav links, lang switcher, email link) | Pending |
| `/privacy` | Legal | 8 | Pending |
| `/disclaimer` | Legal | 8 | Pending |

### Protected (auth required — middleware redirect)

| Route | Layout | Key Elements | Status |
|-------|--------|-------------|--------|
| `/home` | Dashboard | Stats cards, feature cards (4 links), chart period toggle, premium CTA | Pending |
| `/calories` | Dashboard | Date nav (3 buttons), scan food button, meal type tabs, log form, trend chart toggle | Pending |
| `/food-camera` | Dashboard | File input, analyze button, confidence badge, meal log buttons | Pending |
| `/workouts` | Dashboard | Quick add, log workout, exercise library search/filter, modals, delete confirm | Pending |
| `/fasting` | Dashboard | Protocol cards, start/end fast, timer display, history list | Pending |
| `/progress` | Dashboard | Tab toggle, set goal, log weight, photo upload, compare mode | Pending |
| `/body-scan` | Dashboard | 5 scan type cards, photo upload, form fields, photo confirm checkbox, start scan | Pending |
| `/chat` | Dashboard | Message input, 4 suggestion buttons, clear chat, send button | Pending |
| `/profile` | Dashboard | Edit toggle, form fields, save/cancel, credits display, sign out, tour button | Pending |
| `/upgrade` | Dashboard | Period toggle, plan cards, credit pack buy buttons (OUT OF SCOPE) | Pending |

### Auth-Only (special)

| Route | Layout | Elements | Status |
|-------|--------|----------|--------|
| `/auth/callback` | Auth | Loading spinner, error display, retry logic | Pending |
| `/onboarding` | Auth | Multi-step wizard (welcome, profile, goals, tour, done) | Pending |

## Element Classification

### SAFE (click without asking)
- Navigation links (sidebar, footer, header)
- Tab/accordion toggles
- Language switcher options
- Theme toggle (light/dark)
- Modal open/close
- Search/filter inputs
- Date navigation buttons
- Chart period toggles
- Scan type selection cards
- Exercise library browse

### RISKY (ask user before clicking)
- "Create Account" / "Sign In" submit buttons
- "Log Food" / "Save Workout" / "Log Weight" submit
- "Start Scan" / "Analyze Food" AI actions
- "Start Fast" / "End Fast" state changes
- "Send" chat message
- "Clear Chat History" delete action
- "Delete" on any log entry
- "Save Changes" on profile edit
- "Sign Out" button
- "Buy Now" / "Go Pro" / checkout buttons
- "Upload" photo submissions

## Verification Points Per Page

| Page | Key Verification Points |
|------|----------------------|
| `/` | All 7 sections render, i18n switches all text, footer links work, no console errors |
| `/login` | Form requires email+pw, shows error on invalid, Google redirects to accounts.google.com |
| `/register` | All 4 checkboxes required, age < 18 blocked, ethnicity options render, i18n works |
| `/home` | Stats load from API, feature cards link to correct pages |
| `/calories` | Date changes update meals, form validates required fields |
| `/workouts` | Exercise search returns results, filter tabs work |
| `/body-scan` | Photo confirm required before scan, credit check displayed |
| `/chat` | Suggestions clickable, message count displayed |
| `/profile` | Edit mode toggles form, credits display matches API |
