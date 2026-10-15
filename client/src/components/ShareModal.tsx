import React, { useState } from "react";
import { X, UserPlus, Link2, Check, Trash2, Users, Mail } from "lucide-react";
import { FolderItem, FileItem } from "../types";
import { api } from "../api";

interface ShareModalProps {
  item: FolderItem | FileItem;
  type: "file" | "folder";
  onClose: () => void;
  onRefresh: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ item, type, onClose, onRefresh }) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unregisteredEmail, setUnregisteredEmail] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setUnregisteredEmail(null);
    setInviteSuccess(null);
    try {
      await api.shareResource(type, item._id, email, role);
      setEmail("");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to share resource";
      setError(msg);
      if (msg.includes("does not exist on Skybox Drive")) {
        setUnregisteredEmail(email);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!unregisteredEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.inviteByEmail(type, item._id, unregisteredEmail, role);
      setInviteSuccess(unregisteredEmail);
      setShareLink(res.shareUrl);
      setUnregisteredEmail(null);
      setEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invitation email");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createShareLink(type, item._id, "viewer");
      const fullUrl = `${window.location.origin}/share/${res.token}`;
      setShareLink(fullUrl);
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (targetUserId: string) => {
    try {
      await api.revokeShare(type, item._id, targetUserId);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke access");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Users size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>
              Share "{item.name}"
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>

        {inviteSuccess && (
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "rgba(52, 211, 153, 0.15)",
              color: "#34d399",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Check size={16} />
            <span>
              Invitation email sent to <strong>{inviteSuccess}</strong>! A secure share link was created.
            </span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 14px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              marginBottom: "16px"
            }}
          >
            <div>{error}</div>
            {unregisteredEmail && (
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(239, 68, 68, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px"
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                  Send an email invitation with a secure link?
                </span>
                <button
                  type="button"
                  onClick={handleSendInvite}
                  className="btn btn-primary"
                  style={{ padding: "6px 12px", fontSize: "12px", flexShrink: 0 }}
                  disabled={loading}
                >
                  <Mail size={13} />
                  Send Email Invite
                </button>
              </div>
            )}
          </div>
        )}

        {/* Share with People Form */}
        <form onSubmit={handleShare} style={{ marginBottom: "24px" }}>
          <label style={{ display: "block", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Add people by email
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              placeholder="e.g. ravi@skybox.io"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
              className="input-field"
              style={{ width: "110px", flexShrink: 0 }}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flexShrink: 0 }}
            >
              <UserPlus size={16} />
              Share
            </button>
          </div>
        </form>

        {/* Public Link Generator */}
        <div
          style={{
            padding: "14px",
            backgroundColor: "var(--bg-card)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            marginBottom: "24px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "14px", fontWeight: 600 }}>Public Shareable Link</p>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Anyone with the link can view this {type}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateLink}
              className="btn btn-secondary"
              style={{ padding: "8px 14px", fontSize: "13px" }}
              disabled={loading}
            >
              {copied ? <Check size={14} color="#34d399" /> : <Link2 size={14} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          {shareLink && (
            <p
              style={{
                fontSize: "11px",
                color: "var(--accent-blue)",
                marginTop: "8px",
                wordBreak: "break-all"
              }}
            >
              {shareLink}
            </p>
          )}
        </div>

        {/* List of People with Access */}
        <div>
          <h4
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "12px"
            }}
          >
            People with access
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Owner row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                backgroundColor: "var(--bg-card)",
                borderRadius: "var(--radius-sm)"
              }}
            >
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500 }}>{item.ownerId?.name || "Owner"}</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.ownerId?.email}</p>
              </div>
              <span className="badge badge-green">Owner</span>
            </div>

            {/* Shared users */}
            {item.sharedWith &&
              item.sharedWith.map((share, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "var(--radius-sm)"
                  }}
                >
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 500 }}>User ID: {share.userId}</p>
                    <span className="badge badge-blue">{share.role}</span>
                  </div>
                  <button
                    onClick={() => handleRevoke(share.userId)}
                    className="btn btn-danger"
                    style={{ padding: "4px 8px" }}
                    title="Revoke access"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
