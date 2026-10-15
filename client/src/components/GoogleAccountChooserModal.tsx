import React, { useState } from "react";
import { X, Check, Shield, User as UserIcon, ArrowLeft } from "lucide-react";
import { api, setAuthToken } from "../api";
import { AuthSuccessResult } from "../types";

interface GoogleAccountChooserModalProps {
  isOpen: boolean;
  registeredGoogleAccounts?: Array<{ name: string; email: string; avatar?: string }>;
  onClose: () => void;
  onSuccess: (result: AuthSuccessResult) => void;
}

interface MockAccount {
  name: string;
  email: string;
  avatar: string;
}

const DEFAULT_ACCOUNTS: MockAccount[] = [
  {
    name: "Vivek Chandra",
    email: "vivek.chandra@gmail.com",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Vivek%20Chandra&backgroundColor=1a73e8"
  },
  {
    name: "Ravi Chandra",
    email: "ravi.chandra@gmail.com",
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ravi%20Chandra&backgroundColor=0d9488"
  }
];

const GoogleLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
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

export const GoogleAccountChooserModal: React.FC<GoogleAccountChooserModalProps> = ({
  isOpen,
  registeredGoogleAccounts = [],
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<"choose" | "permissions" | "custom">("choose");
  const [selectedAccount, setSelectedAccount] = useState<MockAccount | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merge default accounts with dynamically registered Google accounts
  const displayedAccounts = React.useMemo(() => {
    const map = new Map<string, MockAccount>();
    DEFAULT_ACCOUNTS.forEach((a) => map.set(a.email.toLowerCase(), a));
    registeredGoogleAccounts.forEach((a) => {
      map.set(a.email.toLowerCase(), {
        name: a.name,
        email: a.email.toLowerCase(),
        avatar:
          a.avatar ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(a.name)}&backgroundColor=1a73e8`
      });
    });
    return Array.from(map.values());
  }, [registeredGoogleAccounts]);

  if (!isOpen) return null;

  const createGoogleToken = (targetEmail: string, targetName: string, avatarUrl: string) => {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        iss: "https://accounts.google.com",
        sub: `google-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        email: targetEmail.toLowerCase(),
        name: targetName,
        picture: avatarUrl
      })
    );
    return `${header}.${payload}.googleSignatureMock`;
  };

  const handleSelectAccount = (account: MockAccount) => {
    setSelectedAccount(account);
    setError(null);
    setStep("permissions");
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes("@")) {
      setError("Please enter a valid Gmail or email address.");
      return;
    }
    const name = customName.trim() || customEmail.split("@")[0];
    const account: MockAccount = {
      name,
      email: customEmail.toLowerCase(),
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1a73e8`
    };
    setSelectedAccount(account);
    setStep("permissions");
  };

  const handleAllowPermissions = async () => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    try {
      const token = createGoogleToken(
        selectedAccount.email,
        selectedAccount.name,
        selectedAccount.avatar
      );
      const res = await api.loginWithGoogle(token);
      setAuthToken(res.token);
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: "420px",
          backgroundColor: "#161d2f",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
        }}
      >
        {/* Header with Google Logo & Close */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <GoogleLogo />
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0" }}>Google Accounts</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "16px"
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 1: Account Chooser */}
        {step === "choose" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "22px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>
                Choose an account
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                to continue to <strong style={{ color: "var(--accent-blue)" }}>Skybox Drive</strong>
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {displayedAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleSelectAccount(acc)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    width: "100%"
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(66, 133, 244, 0.12)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(66, 133, 244, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.04)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>{acc.name}</p>
                      <p style={{ fontSize: "12px", color: "#94a3b8" }}>{acc.email}</p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#60a5fa",
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      padding: "2px 8px",
                      borderRadius: "6px"
                    }}
                  >
                    Signed in
                  </span>
                </button>
              ))}

              <button
                onClick={() => setStep("custom")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 14px",
                  backgroundColor: "transparent",
                  border: "1px dashed rgba(255, 255, 255, 0.2)",
                  borderRadius: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  color: "#94a3b8"
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <UserIcon size={18} color="#94a3b8" />
                </div>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
                  Use another Google account
                </span>
              </button>
            </div>

            <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", lineHeight: "1.5" }}>
              To continue, Google will share your name, email address, language preference, and profile picture with Skybox Drive.
            </p>
          </div>
        )}

        {/* STEP 2: Google Permissions Consent */}
        {step === "permissions" && selectedAccount && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              <div style={{ margin: "0 auto 10px", width: "48px", height: "48px" }}>
                <img
                  src={selectedAccount.avatar}
                  alt={selectedAccount.name}
                  style={{ width: "48px", height: "48px", borderRadius: "50%", border: "2px solid #3b82f6" }}
                />
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff" }}>{selectedAccount.name}</p>
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>{selectedAccount.email}</p>
            </div>

            <div
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Shield size={16} color="#3b82f6" />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                  Skybox Drive wants access to:
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "#cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Check size={14} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>See your primary Google Account email address</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Check size={14} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>See your personal info, including profile name and picture</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Check size={14} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <span>Allocate 100 MB of cloud storage quota and receive security notifications</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: "1.4" }}>
              Make sure you trust Skybox Drive. You may be sharing sensitive information with this application.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep("choose")}
                disabled={loading}
                style={{ padding: "10px 16px", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAllowPermissions}
                disabled={loading}
                style={{
                  backgroundColor: "#1a73e8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(26, 115, 232, 0.4)"
                }}
              >
                {loading ? "Authorizing..." : "Allow & Continue"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Custom Google Account Input */}
        {step === "custom" && (
          <form onSubmit={handleCustomSubmit}>
            <button
              type="button"
              onClick={() => setStep("choose")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "none",
                border: "none",
                color: "var(--accent-blue)",
                cursor: "pointer",
                fontSize: "12px",
                marginBottom: "16px",
                padding: 0
              }}
            >
              <ArrowLeft size={14} /> Back to accounts
            </button>

            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "6px" }}>
              Use your Google Account
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              Enter your Google email address to connect with Skybox Drive
            </p>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Gmail Address
              </label>
              <input
                type="email"
                placeholder="you@gmail.com"
                className="input-field"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>
                Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Your Name"
                className="input-field"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep("choose")}
                style={{ padding: "8px 14px", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: "#1a73e8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                Next
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
