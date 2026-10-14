import React, { useState } from "react";
import { Cloud, Sparkles, LogIn, UserPlus } from "lucide-react";
import { api, setAuthToken } from "../api";
import { User } from "../types";

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<"demo" | "login" | "register">("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(demoEmail, "password123");
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? `${err.message}. (Did you run 'npm run seed' in server folder first?)`
          : "Demo login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (tab === "login") {
        const res = await api.login(email, password);
        setAuthToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await api.register(name, email, password);
        setAuthToken(res.token);
        onSuccess(res.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "440px" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              boxShadow: "0 6px 16px rgba(59, 130, 246, 0.4)"
            }}
          >
            <Cloud size={28} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Welcome to Skybox <span style={{ color: "var(--accent-blue)" }}>Drive</span>
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            Production Cloud File Storage & Collaboration
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--bg-card)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px"
          }}
        >
          <button
            style={{
              flex: 1,
              padding: "8px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--radius-sm)",
              backgroundColor: tab === "demo" ? "var(--accent-blue)" : "transparent",
              color: tab === "demo" ? "#ffffff" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={() => setTab("demo")}
          >
            Demo Accounts
          </button>
          <button
            style={{
              flex: 1,
              padding: "8px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--radius-sm)",
              backgroundColor: tab === "login" ? "var(--accent-blue)" : "transparent",
              color: tab === "login" ? "#ffffff" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={() => setTab("login")}
          >
            Log In
          </button>
          <button
            style={{
              flex: 1,
              padding: "8px",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              borderRadius: "var(--radius-sm)",
              backgroundColor: tab === "register" ? "var(--accent-blue)" : "transparent",
              color: tab === "register" ? "#ffffff" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={() => setTab("register")}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              marginBottom: "16px"
            }}
          >
            {error}
          </div>
        )}

        {/* Demo Accounts Tab (Polish Item #1) */}
        {tab === "demo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                padding: "12px",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                fontSize: "12px",
                color: "#93c5fd"
              }}
            >
              Evaluator Quick Access: Click either profile below to instantly explore folders, permissions, and multi-version files.
            </div>

            <button
              onClick={() => handleDemoLogin("alice@skybox.io")}
              className="btn btn-secondary"
              style={{
                padding: "14px",
                justifyContent: "space-between",
                borderColor: "rgba(59, 130, 246, 0.4)"
              }}
              disabled={loading}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={18} color="var(--accent-blue)" />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>Login as Alice Walker</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>alice@skybox.io (Drive Owner)</p>
                </div>
              </div>
              <span className="badge badge-blue">Admin</span>
            </button>

            <button
              onClick={() => handleDemoLogin("bob@skybox.io")}
              className="btn btn-secondary"
              style={{
                padding: "14px",
                justifyContent: "space-between",
                borderColor: "rgba(16, 185, 129, 0.4)"
              }}
              disabled={loading}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={18} color="var(--accent-green)" />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>Login as Bob Stone</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>bob@skybox.io (Editor Partner)</p>
                </div>
              </div>
              <span className="badge badge-green">Editor</span>
            </button>
          </div>
        )}

        {/* Standard Login / Register Form */}
        {tab !== "demo" && (
          <form onSubmit={handleCustomSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {tab === "register" && (
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vivek Chandra"
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@domain.com"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: "10px", justifyContent: "center" }} disabled={loading}>
              {tab === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
              {loading ? "Processing..." : tab === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
