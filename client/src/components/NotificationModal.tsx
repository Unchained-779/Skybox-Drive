import React from "react";
import { X, Mail, ShieldAlert, CheckCircle, ExternalLink } from "lucide-react";
import { SecurityNotificationItem } from "../types";

interface NotificationModalProps {
  isOpen: boolean;
  notifications: SecurityNotificationItem[];
  onClose: () => void;
  onSelectEmail: (item: SecurityNotificationItem) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  notifications,
  onClose,
  onSelectEmail
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9998 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: "520px",
          width: "90%",
          maxHeight: "80vh",
          padding: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border-color)",
          backgroundColor: "#0f172a"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(20, 30, 51, 0.8)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShieldAlert size={18} color="var(--accent-blue)" />
            </div>
            <div>
              <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Security Notifications &amp; Emails
              </h4>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                Official sign-in logs and security alerts sent to your email
              </p>
            </div>
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

        {/* List of Notifications */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <CheckCircle size={36} color="var(--accent-green)" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#f8fafc" }}>No security alerts</p>
              <p style={{ fontSize: "12px", marginTop: "4px" }}>
                All your login sessions and account actions are secure.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item._id}
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  backgroundColor: item.isRead ? "rgba(20, 30, 51, 0.5)" : "rgba(59, 130, 246, 0.1)",
                  border: item.isRead
                    ? "1px solid rgba(255, 255, 255, 0.05)"
                    : "1px solid rgba(59, 130, 246, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Mail size={16} color={item.isRead ? "var(--text-muted)" : "var(--accent-blue)"} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: item.isRead ? "#cbd5e1" : "#ffffff" }}>
                      {item.subject}
                    </span>
                  </div>
                  {!item.isRead && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        backgroundColor: "var(--accent-blue)",
                        color: "#ffffff",
                        padding: "2px 6px",
                        borderRadius: "10px"
                      }}
                    >
                      New
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
                  <span>Sent to: <strong style={{ color: "#93c5fd" }}>{item.to}</strong></span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    onClick={() => {
                      onSelectEmail(item);
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      borderColor: "rgba(59, 130, 246, 0.3)",
                      color: "#93c5fd"
                    }}
                  >
                    Read Full Email
                  </button>

                  {item.previewUrl && (
                    <a
                      href={item.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        textDecoration: "none",
                        padding: "6px 10px"
                      }}
                    >
                      Ethereal Preview <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            backgroundColor: "rgba(20, 30, 51, 0.8)"
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
