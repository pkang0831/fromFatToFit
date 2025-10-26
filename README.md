# From Fat To Fit

A minimal full-stack starter that combines a FastAPI backend with a Next.js frontend for logging meals, tracking daily nutrition, and delivering motivational feedback based on calorie targets.

## Features

- **User authentication** with email/password plus persistent session tokens stored in the database.
- **Nutrition schema** covering users, meals, meal items, detailed food entries, and daily summaries with generated motivation messages.
- **Daily dashboard** that displays today's meals, running calorie and macro totals, and tailored coaching blurbs.

## Project structure

```
fromFatToFit/
├── backend/
│   ├── app/
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── schemas.py
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/MealForm.tsx
    ├── lib/api.ts
    ├── next-env.d.ts
    ├── next.config.js
    ├── package.json
    └── tsconfig.json
```

## Getting started

### Backend

1. Create a virtual environment and install dependencies:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Launch the FastAPI server:

   ```bash
   uvicorn app.main:app --reload
   ```

   The API listens on `http://localhost:8000` by default.

### Frontend

1. Install Node dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Start the Next.js development server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to use the dashboard. The app expects the backend to be available at `http://localhost:8000`; override this by setting `NEXT_PUBLIC_API_BASE_URL` before running `npm run dev`.

## API overview

- `POST /auth/register` – Create a user, receive a session token cookie and JSON response with token and user info.
- `POST /auth/login` – Authenticate and refresh the session token (accepts optional `daily_calorie_target` updates).
- `POST /auth/logout` – Clear the current session.
- `GET /auth/me` – Retrieve the authenticated user's profile.
- `POST /meals` – Log a meal with one or more items and nutrition details.
- `GET /dashboard` – Fetch today's meals and the computed daily summary, including motivation messaging.
- `GET /summaries/{date}` – Retrieve a summary for any recorded day (recomputed on demand).

## Daily summary logic

Each time a meal is logged, the backend recomputes the totals for calories, protein, carbs, and fat, then generates a message based on the variance from the user's calorie target:

- **Surplus (> +200 kcal):** Encourages balancing the day.
- **On target (±200 kcal):** Reinforces consistency.
- **Deficit (< -200 kcal):** Reminds users to fuel appropriately while celebrating the deficit.

These insights are persisted to the `daily_summaries` table for quick retrieval.

## Notes

- The project uses SQLite by default. Adjust `DATABASE_URL` in `backend/app/database.py` for other databases.
- Session tokens are returned in both the response JSON and an HTTP-only cookie named `session_token` to support browser clients.
- The frontend uses fetch calls with `credentials: "include"` to automatically send the session cookie with each request.
