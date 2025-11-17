"use client";

import { FormEvent, useEffect, useState } from "react";

import TemplateOne from "@/components/dashboard/TemplateOne";
import TemplateThree from "@/components/dashboard/TemplateThree";
import TemplateTwo from "@/components/dashboard/TemplateTwo";
import { DashboardData, getDashboard, login, logout, register } from "@/lib/api";

export default function Page() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [selectedTemplate, setSelectedTemplate] = useState<"template1" | "template2" | "template3">("template1");

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

    setError(null);
    setIsLoading(true);
    try {
      if (authMode === "login") {
        const data = await login(email, password);
        setDashboard(data);
      } else {
        // 회원가입
        const targetRaw = form.get("target");
        const target = targetRaw ? Number(targetRaw) : 2000;
        const heightRaw = form.get("height_cm");
        const weightRaw = form.get("weight_kg");
        const ageRaw = form.get("age");
        const genderRaw = form.get("gender");
        const activityLevelRaw = form.get("activity_level");
        
        const registerData = {
          email,
          password,
          daily_calorie_target: target,
          height_cm: heightRaw ? Number(heightRaw) : undefined,
          weight_kg: weightRaw ? Number(weightRaw) : undefined,
          age: ageRaw ? Number(ageRaw) : undefined,
          gender: genderRaw ? (genderRaw as "male" | "female") : undefined,
          activity_level: activityLevelRaw ? (activityLevelRaw as "sedentary" | "light" | "moderate" | "heavy" | "athlete") : "sedentary",
        };
        
        const data = await register(registerData);
        setDashboard(data);
      }
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

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
      setDashboard(null);
      setAuthMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log out");
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
              <>
                <label className="auth-label">
                  Daily calorie target
                  <input name="target" type="number" min={1000} max={10000} defaultValue={2000} className="auth-input" />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label className="auth-label">
                    Height (cm)
                    <input name="height_cm" type="number" min={50} max={300} className="auth-input" placeholder="170" />
                  </label>
                  <label className="auth-label">
                    Weight (kg)
                    <input name="weight_kg" type="number" min={20} max={500} step="0.1" className="auth-input" placeholder="70" />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label className="auth-label">
                    Age
                    <input name="age" type="number" min={1} max={150} className="auth-input" placeholder="30" />
                  </label>
                  <label className="auth-label">
                    Gender
                    <select name="gender" className="auth-input" defaultValue="">
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </label>
                </div>
                <label className="auth-label">
                  Activity Level
                  <select name="activity_level" className="auth-input" defaultValue="sedentary">
                    <option value="sedentary">Sedentary (Little to no exercise)</option>
                    <option value="light">Light Exercise (1-3 days/week)</option>
                    <option value="moderate">Moderate Exercise (3-5 days/week)</option>
                    <option value="heavy">Heavy Exercise (6-7 days/week)</option>
                    <option value="athlete">Athlete (Very heavy exercise, physical job)</option>
                  </select>
                </label>
              </>
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

  const renderDashboard = () => {
    switch (selectedTemplate) {
      case "template2":
        return <TemplateTwo data={dashboard} onRefresh={refreshDashboard} />;
      case "template3":
        return <TemplateThree data={dashboard} onRefresh={refreshDashboard} />;
      default:
        return <TemplateOne data={dashboard} onRefresh={refreshDashboard} />;
    }
  };

  return (
    <div className="dashboard-shell">
      <div className="dashboard-toolbar" role="region" aria-label="Account controls">
        <div className="dashboard-toolbar__info">
          <span className="dashboard-toolbar__label">Signed in as</span>
          <span className="dashboard-toolbar__email">{dashboard.user.email}</span>
        </div>
        <button type="button" className="dashboard-toolbar__button" onClick={handleLogout}>
          Log out
        </button>
      </div>
      <div className="template-selector" role="tablist" aria-label="Dashboard templates">
        <button
          type="button"
          role="tab"
          aria-selected={selectedTemplate === "template1"}
          className={`template-selector__button${selectedTemplate === "template1" ? " template-selector__button--active" : ""}`}
          onClick={() => setSelectedTemplate("template1")}
        >
          Food Logs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedTemplate === "template2"}
          className={`template-selector__button${selectedTemplate === "template2" ? " template-selector__button--active" : ""}`}
          onClick={() => setSelectedTemplate("template2")}
        >
          Workout Logs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedTemplate === "template3"}
          className={`template-selector__button${selectedTemplate === "template3" ? " template-selector__button--active" : ""}`}
          onClick={() => setSelectedTemplate("template3")}
        >
          Template 3
        </button>
      </div>
      {renderDashboard()}
    </div>
  );
}
