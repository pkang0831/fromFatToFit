"use client";

import { FormEvent, useEffect, useState } from "react";

import MealForm from "@/components/MealForm";
import { DashboardData, getDashboard, login, register } from "@/lib/api";

export default function Page() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  useEffect(() => {
    (async () => {
      try {
        const data = await getDashboard();
        setDashboard(data);
      } catch (err) {
        setDashboard(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const targetRaw = form.get("target");
    const target = targetRaw ? Number(targetRaw) : 2000;

    setError(null);
    setIsLoading(true);
    try {
      const data =
        authMode === "login" ? await login(email, password) : await register(email, password, target);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      const data = await getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh data");
    }
  };

  if (isLoading && !dashboard) {
    return <p className="text-muted" style={{ textAlign: "center", marginTop: "120px" }}>Loading dashboard...</p>;
  }

  if (!dashboard) {
    return (
      <section className="auth-page">
        <div className="auth-backdrop" />
        <div className="auth-card">
          <header className="auth-card__header">
            <h1 className="auth-title">From Fat To Fit</h1>
            <p className="auth-subtitle">
              {authMode === "login" ? "Sign in to view your dashboard" : "Create an account to start tracking"}
            </p>
          </header>
          <form className="auth-form" onSubmit={handleAuth}>
            <label className="auth-label">
              Email
              <input name="email" type="email" required className="auth-input" placeholder="you@example.com" />
            </label>
            <label className="auth-label">
              Password
              <input name="password" type="password" required minLength={6} className="auth-input" />
            </label>
            {authMode === "register" && (
              <label className="auth-label">
                Daily calorie target
                <input name="target" type="number" min={1000} max={10000} defaultValue={2000} className="auth-input" />
              </label>
            )}
            <button type="submit" className="auth-button">
              {authMode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          {error && <p className="error-text" style={{ textAlign: "center" }}>{error}</p>}
          <p className="auth-switcher">
            {authMode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
            <button
              onClick={() => setAuthMode((mode) => (mode === "login" ? "register" : "login"))}
              className="auth-toggle"
              type="button"
            >
              {authMode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    );
  }

  const totals = dashboard.summary;

  return (
    <div className="container">
      <section style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <header className="card">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Welcome back, {dashboard.user.email}</h1>
              <p className="text-muted">Stay consistent—log meals as you go today.</p>
            </div>
            <span className="badge">Target {dashboard.user.daily_calorie_target} kcal</span>
          </div>
          <div className="success-banner" style={{ marginTop: "16px" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{totals.motivation_message}</p>
            <p className="text-small" style={{ marginTop: "8px" }}>
              Today's intake: {totals.total_calories.toFixed(0)} kcal • Protein {totals.total_protein.toFixed(1)} g • Carbs {totals.total_carbs.toFixed(1)} g • Fat {totals.total_fat.toFixed(1)} g
            </p>
          </div>
        </header>

        <MealForm onLogged={refreshDashboard} />

        <section>
          <h2 className="section-title">Today's meals</h2>
          {dashboard.meals.length === 0 ? (
            <div className="subtle-card">No meals logged yet. Start by adding one above!</div>
          ) : (
            dashboard.meals.map((meal) => (
              <article key={meal.id} className="card">
                <h3 style={{ marginTop: 0, fontSize: "1.25rem", fontWeight: 600 }}>{meal.name}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {meal.items.map((item) => (
                    <li key={item.id} className="meal-item">
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px" }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
                          {item.quantity && (
                            <p className="text-small" style={{ margin: "4px 0 0" }}>
                              {item.quantity}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-small" style={{ margin: "4px 0 0" }}>
                              {item.notes}
                            </p>
                          )}
                        </div>
                        {item.food_entries.map((entry, idx) => (
                          <div key={idx} className="text-small" style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, fontWeight: 600 }}>{entry.calories.toFixed(0)} kcal</p>
                            <p style={{ margin: "4px 0 0" }}>
                              P {entry.protein?.toFixed(1) ?? 0} g • C {entry.carbs?.toFixed(1) ?? 0} g • F {entry.fat?.toFixed(1) ?? 0} g
                            </p>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))
          )}
        </section>
      </section>
    </div>
  );
}
