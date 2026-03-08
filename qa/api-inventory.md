# API Inventory — Devenira

> All endpoints observed from codebase analysis and UI network traffic.
> Backend: FastAPI on `http://localhost:8000`
> OpenAPI docs: `http://localhost:8000/docs` (non-production only)

## Summary

| Router | Prefix | Endpoints | Auth Required | Dangerous Ops |
|--------|--------|-----------|---------------|---------------|
| Root | `/` | 2 | 0 | 0 |
| Auth | `/api/auth` | 6 | 3 | 0 |
| Food | `/api/food` | 8 | 8 | 1 (delete) |
| Food Database | `/api/food-database` | 5 | 0 | 0 |
| Food Decision | `/api/food-decision` | 4 | 4 | 0 |
| Workout | `/api/workout` | 7 | 7 | 1 (delete) |
| Body | `/api/body` | 7 | 7 | 0 |
| Payments | `/api/payments` | 7 | 5 | 4 |
| Dashboard | `/api/dashboard` | 3 | 3 | 0 |
| Weight | `/api/weight` | 6 | 6 | 1 (delete) |
| Notifications | `/api/notifications` | 4 | 4 | 0 |
| Chat | `/api/chat` | 4 | 4 | 1 (delete history) |
| **Total** | | **63** | **51** | **8** |

## Detailed Endpoint List

### Root

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| GET | `/` | No | No | Safe | API info |
| GET | `/health` | No | No | Safe | Health check |

### Auth (`/api/auth`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| POST | `/register` | No | 5/min | Risky | Requires 4 consent fields, age >= 18 |
| POST | `/login` | No | 10/min | Risky | Returns JWT tokens |
| POST | `/logout` | Yes | No | Safe | |
| GET | `/me` | Yes | No | Safe | Current user profile |
| PUT | `/profile` | Yes | No | Risky | Update profile data |
| POST | `/reset-password` | No | 3/min | Risky | Sends email (OUT OF SCOPE) |

### Food (`/api/food`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| POST | `/log` | Yes | No | Risky | Create food log |
| POST | `/analyze-photo` | Yes | 10/min | Risky | AI analysis, costs credits |
| GET | `/daily/{date}` | Yes | No | Safe | |
| GET | `/trends` | Yes | No | Safe | |
| GET | `/recent` | Yes | No | Safe | |
| PUT | `/log/{id}` | Yes | No | Risky | |
| DELETE | `/log/{id}` | Yes | No | Dangerous | |
| POST | `/log-natural` | Yes | 10/min | Risky | AI natural language logging |

### Food Database (`/api/food-database`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| GET | `/search` | No | 60/min | Safe | Public search |
| GET | `/categories` | No | 30/min | Safe | |
| GET | `/{food_id}` | No | 60/min | Safe | |
| POST | `/calculate` | No | 60/min | Safe | Nutrition calc |
| GET | `/stats/overview` | No | 30/min | Safe | |

### Food Decision (`/api/food-decision`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| POST | `/should-i-eat` | Yes | 10/min | Risky | AI analysis |
| POST | `/recommend` | Yes | 10/min | Risky | AI recommendations |
| GET | `/preferences` | Yes | 30/min | Safe | |
| PUT | `/preferences` | Yes | 20/min | Risky | |

### Workout (`/api/workout`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| GET | `/exercises/library` | Yes | 60/min | Safe | |
| POST | `/log` | Yes | 30/min | Risky | |
| GET | `/logs/{date}` | Yes | 60/min | Safe | |
| GET | `/logs-range` | Yes | 60/min | Safe | |
| GET | `/trends` | Yes | 30/min | Safe | |
| POST | `/analyze-form` | Yes | 10/min | Risky | AI video analysis |
| DELETE | `/log/{id}` | Yes | 30/min | Dangerous | |

### Body (`/api/body`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| POST | `/estimate-bodyfat` | Yes | 5/min | Risky | AI + credits |
| POST | `/percentile` | Yes | 5/min | Risky | AI + credits |
| POST | `/transformation` | Yes | 5/min | Risky | Replicate + credits |
| POST | `/enhancement` | Yes | 5/min | Risky | DALL-E + credits |
| GET | `/scans/history` | Yes | No | Safe | |
| POST | `/segment` | Yes | 10/min | Risky | SAM segmentation |
| POST | `/transform-region` | Yes | 5/min | Risky | Region transform |

### Payments (`/api/payments`) — OUT OF SCOPE for execution

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| POST | `/create-checkout-session` | Yes | 5/min | Dangerous | Stripe |
| POST | `/webhook` | No | No | Dangerous | Stripe signature |
| POST | `/verify-purchase` | Yes | No | Dangerous | RevenueCat |
| GET | `/subscription` | Yes | No | Safe | |
| GET | `/usage-limits` | Yes | No | Safe | |
| GET | `/credits` | Yes | No | Safe | |
| POST | `/buy-credits` | Yes | 5/min | Dangerous | Stripe |

### Dashboard (`/api/dashboard`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| GET | `/` | Yes | 60/min | Safe | |
| GET | `/quick-stats` | Yes | 60/min | Safe | |
| GET | `/calorie-balance-trend` | Yes | 30/min | Safe | |

### Weight (`/api/weight`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| POST | `/log` | Yes | 30/min | Risky | |
| GET | `/logs` | Yes | 60/min | Safe | |
| PATCH | `/log/{id}` | Yes | 30/min | Risky | |
| DELETE | `/log/{id}` | Yes | 30/min | Dangerous | |
| PATCH | `/goals` | Yes | 20/min | Risky | |
| GET | `/projection` | Yes | 30/min | Safe | |

### Notifications (`/api/notifications`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| GET | `/preferences` | Yes | 30/min | Safe | |
| PUT | `/preferences` | Yes | 20/min | Risky | |
| POST | `/push/subscribe` | Yes | 10/min | Risky | |
| POST | `/push/unsubscribe` | Yes | 10/min | Risky | |

### Chat (`/api/chat`)

| Method | Path | Auth | Rate Limit | Risk | Notes |
|--------|------|------|-----------|------|-------|
| GET | `/status` | Yes | No | Safe | |
| POST | `/message` | Yes | 20/min | Risky | AI call |
| GET | `/history` | Yes | No | Safe | |
| DELETE | `/history` | Yes | No | Dangerous | |

## Observed Issues

*(Populated during testing)*
