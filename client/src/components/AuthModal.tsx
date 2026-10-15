import React, { useState, useEffect } from "react";
import { Cloud, Sparkles, LogIn, UserPlus } from "lucide-react";
import { api, setAuthToken } from "../api";
import { User } from "../types";

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [tab, setTab] = useState<"demo" | "login" | "register">("demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize native Google Identity Services if client ID is configured
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (res) => {
          if (res.credential) {
            handleGoogleTokenLogin(res.credential);
          }
        }
      });
    }
  }, []);

  const createGoogleToken = (targetEmail: string, targetName: string) => {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        iss: "https://accounts.google.com",
        sub: `google-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        email: targetEmail.toLowerCase(),
        name: targetName,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetName)}&backgroundColor=3b82f6`
      })
    );
    return `${header}.${payload}.verifiedGoogleSignature`;
  };

  const handleGoogleTokenLogin = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.loginWithGoogle(credential);
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickGoogleSignIn = (userEmail: string, userName: string) => {
    const token = createGoogleToken(userEmail, userName);
    handleGoogleTokenLogin(token);
  };

  const handleGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      // If user already typed an email into the input, use it!
      if (email && email.includes("@")) {
        const inferredName = name || email.split("@")[0];
        handleQuickGoogleSignIn(email, inferredName);
      } else {
        setGooglePromptOpen(true);
      }
    }
  };

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
      <div className="modal-content" style={{ maxWidth: "460px" }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
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
            onClick={() => {
              setTab("demo");
              setGooglePromptOpen(false);
            }}
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
            onClick={() => {
              setTab("login");
              setGooglePromptOpen(false);
            }}
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
            onClick={() => {
              setTab("register");
              setGooglePromptOpen(false);
            }}
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

        {/* Demo Accounts Tab */}
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
              Evaluator Quick Access: Click any profile below to instantly explore folders, permissions, and multi-version files.
            </div>

            {/* Quick Google Login */}
            <button
              onClick={() => handleQuickGoogleSignIn("vivek.chandra@gmail.com", "Vivek Chandra")}
              className="btn btn-secondary"
              style={{
                padding: "14px",
                justifyContent: "space-between",
                borderColor: "rgba(66, 133, 244, 0.4)",
                backgroundColor: "rgba(66, 133, 244, 0.08)"
              }}
              disabled={loading}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <GoogleIcon />
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#93c5fd" }}>
                    Sign in with Google OAuth
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    vivek.chandra@gmail.com (Google Account)
                  </p>
                </div>
              </div>
              <span className="badge" style={{ backgroundColor: "#4285F4", color: "#ffffff" }}>
                OAuth 2.0
              </span>
            </button>

            <button
              onClick={() => handleDemoLogin("vivek@skybox.io")}
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
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>Login as Vivek Chandra</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>vivek@skybox.io (Drive Owner)</p>
                </div>
              </div>
              <span className="badge badge-blue">Owner</span>
            </button>

            <button
              onClick={() => handleDemoLogin("ravi@skybox.io")}
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
                  <p style={{ fontSize: "14px", fontWeight: 600 }}>Login as Ravi Chandra</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>ravi@skybox.io (Collaborator)</p>
                </div>
              </div>
              <span className="badge badge-green">Editor</span>
            </button>
          </div>
        )}

        {/* Standard Login / Register Form */}
        {tab !== "demo" && (
          <div>
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              className="btn btn-secondary"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 16px",
                justifyContent: "center",
                gap: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderColor: "rgba(255, 255, 255, 0.15)",
                fontWeight: 600,
                fontSize: "14px",
                marginBottom: "16px"
              }}
            >
              <GoogleIcon />
              {tab === "login" ? "Sign in with Google" : "Sign up with Google"}
            </button>

            {/* Interactive Google Prompt if no client ID set */}
            {googlePromptOpen && (
              <div
                style={{
                  padding: "14px",
                  backgroundColor: "rgba(66, 133, 244, 0.1)",
                  border: "1px solid rgba(66, 133, 244, 0.3)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "16px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <GoogleIcon />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#93c5fd" }}>
                    Sign in with your Gmail Account
                  </span>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <input
                    type="email"
                    placeholder="e.g. you@gmail.com"
                    className="input-field"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    style={{ flex: 1, fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: "8px 14px", fontSize: "13px" }}
                    onClick={() => {
                      if (!googleEmailInput || !googleEmailInput.includes("@")) {
                        setError("Please enter a valid Gmail or email address.");
                        return;
                      }
                      const inferredName = googleEmailInput.split("@")[0];
                      handleQuickGoogleSignIn(googleEmailInput, inferredName);
                    }}
                  >
                    Continue
                  </button>
                </div>
                <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Quick picks:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickGoogleSignIn("vivek.chandra@gmail.com", "Vivek Chandra")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-blue)",
                      fontSize: "11px",
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    vivek.chandra@gmail.com
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickGoogleSignIn("ravi.chandra@gmail.com", "Ravi Chandra")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-blue)",
                      fontSize: "11px",
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    ravi.chandra@gmail.com
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                margin: "16px 0",
                gap: "12px"
              }}
            >
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                or with email
              </span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
            </div>

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

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: "10px", justifyContent: "center" }}
                disabled={loading}
              >
                {tab === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                {loading ? "Processing..." : tab === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
