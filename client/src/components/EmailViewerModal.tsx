import React from "react";
import { X, Mail, ExternalLink, ShieldCheck } from "lucide-react";
import { WelcomeEmail, SecurityNotificationItem } from "../types";

interface EmailViewerModalProps {
  email: WelcomeEmail | SecurityNotificationItem | null;
  onClose: () => void;
}

export const EmailViewerModal: React.FC<EmailViewerModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: "600px",
          width: "90%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
          backgroundColor: "#0d1527"
        }}
      >
        {/* Email Client Top Bar */}
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
              <Mail size={18} color="var(--accent-blue)" />
            </div>
            <div>
              <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Security Alert Mailbox
              </h4>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Verified Skybox Security Notification
              </span>
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
            <X size={20} />
          </button>
        </div>

        {/* Email Header Info */}
        <div
          style={{
            padding: "16px 20px",
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "6px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              {email.subject}
            </h3>
            {email.previewUrl && (
              <a
                href={email.previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#60a5fa",
                  textDecoration: "none",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontWeight: 600
                }}
              >
                Ethereal Web Inbox <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
            <div>
              <strong style={{ color: "var(--text-muted)" }}>From: </strong>
              <span style={{ color: "#93c5fd" }}>Skybox Security Team &lt;security@skybox.io&gt;</span>
            </div>
            <div>
              <strong style={{ color: "var(--text-muted)" }}>To: </strong>
              <span style={{ color: "#e2e8f0" }}>{email.to}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>DKIM signed &amp; TLS encrypted authentication record</span>
          </div>
        </div>

        {/* Rendered HTML Email Body */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            flex: 1,
            backgroundColor: "#070b14"
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: email.htmlContent }}
            style={{
              all: "initial",
              fontFamily: "inherit"
            }}
          />
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
            className="btn btn-primary"
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
