"use client";

import { FormEvent, useEffect, useState } from "react";

import TemplateOne from "@/components/dashboard/TemplateOne";
import TemplateThree from "@/components/dashboard/TemplateThree";
import TemplateTwo from "@/components/dashboard/TemplateTwo";
import { DashboardData, getDashboard, login, register } from "@/lib/api";

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
      <div className="template-selector" role="tablist" aria-label="Dashboard templates">
        <button
          type="button"
          role="tab"
          aria-selected={selectedTemplate === "template1"}
          className={`template-selector__button${selectedTemplate === "template1" ? " template-selector__button--active" : ""}`}
          onClick={() => setSelectedTemplate("template1")}
        >
          Template 1
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedTemplate === "template2"}
          className={`template-selector__button${selectedTemplate === "template2" ? " template-selector__button--active" : ""}`}
          onClick={() => setSelectedTemplate("template2")}
        >
          Template 2
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
