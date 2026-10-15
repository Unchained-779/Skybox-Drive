import React, { useState, useEffect, useCallback } from "react";
import { Cloud, LogIn, UserPlus, Users, ArrowRight } from "lucide-react";
import { api, setAuthToken } from "../api";
import { AuthSuccessResult, UserProfileSummary } from "../types";
import { GoogleAccountChooserModal } from "./GoogleAccountChooserModal";

interface AuthModalProps {
  onSuccess: (result: AuthSuccessResult) => void;
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
  const [tab, setTab] = useState<"profiles" | "login" | "register">("profiles");
  const [profiles, setProfiles] = useState<UserProfileSummary[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all registered / active accounts for the front page
  const loadProfiles = useCallback(async () => {
    try {
      setProfilesLoading(true);
      const list = await api.getPublicProfiles();
      setProfiles(list);
    } catch {
      // Fallback default list if backend is initializing
      setProfiles([
        {
          id: "demo-1",
          name: "Vivek Chandra",
          email: "vivek@skybox.io",
          authProvider: "local",
          storageQuota: 104857600,
          usedStorage: 0,
          createdAt: new Date().toISOString()
        },
        {
          id: "demo-2",
          name: "Ravi Chandra",
          email: "ravi@skybox.io",
          authProvider: "local",
          storageQuota: 104857600,
          usedStorage: 0,
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setProfilesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Initialize native Google Identity Services if client ID is configured
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (res: { credential: string }) => {
          if (res.credential) {
            handleGoogleTokenLogin(res.credential);
          }
        }
      });
    }
  }, []);

  const handleGoogleTokenLogin = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.loginWithGoogle(credential);
      setAuthToken(res.token);
      onSuccess(res);
      loadProfiles();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
    // Always open modern Google Account Chooser & Permissions dialog
    setShowGoogleChooser(true);
  };

  // 1-Click quick login for any registered profile on the front page
  const handleProfileClick = async (profile: UserProfileSummary) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.quickLogin(profile.email);
      setAuthToken(res.token);
      onSuccess(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to login as ${profile.name}.`
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
        onSuccess(res);
        loadProfiles();
      } else {
        const res = await api.register(name, email, password);
        setAuthToken(res.token);
        onSuccess(res);
        loadProfiles();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: "480px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          {/* Brand Header */}
          <div style={{ textAlign: "center", marginBottom: "18px", flexShrink: 0 }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px",
                boxShadow: "0 6px 16px rgba(59, 130, 246, 0.4)"
              }}
            >
              <Cloud size={28} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Welcome to Skybox <span style={{ color: "var(--accent-blue)" }}>Drive</span>
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
              Production Cloud File Storage &amp; Collaboration
            </p>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--bg-card)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              marginBottom: "16px",
              flexShrink: 0
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
                backgroundColor: tab === "profiles" ? "var(--accent-blue)" : "transparent",
                color: tab === "profiles" ? "#ffffff" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
              onClick={() => setTab("profiles")}
            >
              <Users size={14} />
              Profiles ({profiles.length})
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
                marginBottom: "14px",
                flexShrink: 0
              }}
            >
              {error}
            </div>
          )}

          {/* FRONT PAGE: ALL REGISTERED & LOGGED-IN PROFILES */}
          {tab === "profiles" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", paddingRight: "4px" }}>
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  fontSize: "12px",
                  color: "#93c5fd"
                }}
              >
                Instant Access: All registered accounts appear below. Click any profile to enter their drive workspace immediately.
              </div>

              {/* Google Account Chooser Action Button */}
              <button
                onClick={handleGoogleClick}
                className="btn btn-secondary"
                style={{
                  padding: "12px 14px",
                  justifyContent: "space-between",
                  borderColor: "rgba(66, 133, 244, 0.4)",
                  backgroundColor: "rgba(66, 133, 244, 0.08)"
                }}
                disabled={loading}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <GoogleIcon />
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#93c5fd" }}>
                      Continue with Google (Account Chooser)
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Choose or switch any Google account with OAuth 2.0
                    </p>
                  </div>
                </div>
                <span className="badge" style={{ backgroundColor: "#4285F4", color: "#ffffff", fontSize: "10px" }}>
                  OAuth 2.0
                </span>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Registered Profiles ({profiles.length})
                </span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
              </div>

              {/* Dynamic Profiles List */}
              {profilesLoading ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                  Loading registered profiles...
                </div>
              ) : profiles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                  No accounts registered yet. Use Sign Up or Google to create one.
                </div>
              ) : (
                profiles.map((p) => {
                  const isOwner = p.email === "vivek@skybox.io";
                  const isEditor = p.email === "ravi@skybox.io";
                  const isGoogle = p.authProvider === "google";

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProfileClick(p)}
                      className="btn btn-secondary"
                      style={{
                        padding: "12px 14px",
                        justifyContent: "space-between",
                        alignItems: "center",
                        textAlign: "left",
                        width: "100%",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        borderColor: isOwner
                          ? "rgba(59, 130, 246, 0.4)"
                          : isGoogle
                          ? "rgba(66, 133, 244, 0.35)"
                          : "rgba(255, 255, 255, 0.1)",
                        transition: "all 0.15s ease"
                      }}
                      disabled={loading}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {p.avatar ? (
                          <img
                            src={p.avatar}
                            alt={p.name}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "2px solid rgba(59, 130, 246, 0.4)"
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: isOwner ? "var(--accent-blue)" : "var(--bg-hover)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "14px"
                            }}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <p style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>{p.name}</p>
                            {isGoogle && <GoogleIcon />}
                          </div>
                          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{p.email}</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isOwner ? (
                          <span className="badge badge-blue">Owner</span>
                        ) : isEditor ? (
                          <span className="badge badge-green">Editor</span>
                        ) : isGoogle ? (
                          <span className="badge" style={{ backgroundColor: "rgba(66, 133, 244, 0.2)", color: "#93c5fd" }}>
                            Google
                          </span>
                        ) : (
                          <span className="badge" style={{ backgroundColor: "rgba(255, 255, 255, 0.08)", color: "#cbd5e1" }}>
                            Member
                          </span>
                        )}
                        <ArrowRight size={14} color="var(--text-muted)" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Standard Login / Register Form */}
          {tab !== "profiles" && (
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

      {/* Modern Google Account Chooser & Permissions Consent Dialog */}
      <GoogleAccountChooserModal
        isOpen={showGoogleChooser}
        registeredGoogleAccounts={profiles.filter((p) => p.authProvider === "google")}
        onClose={() => setShowGoogleChooser(false)}
        onSuccess={(res) => {
          onSuccess(res);
          loadProfiles();
        }}
      />
    </>
  );
};
