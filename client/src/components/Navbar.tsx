import React from "react";
import { Search, LogOut, User as UserIcon, Bell } from "lucide-react";
import { User } from "../types";

interface NavbarProps {
  user: User | null;
  searchQuery: string;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onSearchChange: (query: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  searchQuery,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onSearchChange,
  onLogout
}) => {
  return (
    <header className="topbar">
      {/* Search Input */}
      <div style={{ position: "relative", width: "420px", maxWidth: "100%" }}>
        <Search
          size={18}
          color="var(--text-muted)"
          style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          placeholder="Search in Drive (files, folders)..."
          className="input-field"
          style={{
            paddingLeft: "42px",
            backgroundColor: "rgba(20, 30, 51, 0.6)",
            borderRadius: "9999px"
          }}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* User Info & Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-blue)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.4)",
                overflow: "hidden",
                border: user.avatar ? "2px solid rgba(59, 130, 246, 0.6)" : "none"
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    // Fallback to initial if image URL fails to load
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600 }}>{user.name}</span>
                {user.authProvider === "google" && (
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(59, 130, 246, 0.2)",
                      color: "#60a5fa",
                      fontWeight: 600
                    }}
                  >
                    Google
                  </span>
                )}
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</span>
            </div>

            {/* Security Alerts / Emails Bell */}
            <button
              onClick={onOpenNotifications}
              className="btn btn-secondary"
              style={{
                position: "relative",
                padding: "8px 12px",
                marginLeft: "4px"
              }}
              title="Security Alerts & Emails"
            >
              <Bell size={16} />
              {unreadNotificationsCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent-red)",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.5)"
                  }}
                >
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={onLogout}
              className="btn btn-secondary"
              style={{ padding: "8px 12px", marginLeft: "4px" }}
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <UserIcon size={18} color="var(--text-muted)" />
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Not logged in</span>
          </div>
        )}
      </div>
    </header>
  );
};
