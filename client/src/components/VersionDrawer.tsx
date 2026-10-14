import React, { useState } from "react";
import { X, History, RotateCcw, Upload, CheckCircle } from "lucide-react";
import { FileItem } from "../types";
import { api } from "../api";

interface VersionDrawerProps {
  file: FileItem;
  onClose: () => void;
  onRefresh: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const VersionDrawer: React.FC<VersionDrawerProps> = ({ file, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async (versionNumber: number) => {
    setLoading(true);
    setError(null);
    try {
      await api.restoreVersion(file._id, versionNumber);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to restore version");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFile = e.target.files[0];

    setLoading(true);
    setError(null);
    try {
      await api.uploadVersion(file._id, newFile);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload new version");
    } finally {
      setLoading(false);
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
            <History size={20} color="var(--accent-blue)" />
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Version History</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{file.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={20} />
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

        {/* Upload New Version Button */}
        <div style={{ marginBottom: "20px" }}>
          <label
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", cursor: "pointer" }}
          >
            <Upload size={16} />
            <span>Upload New Version</span>
            <input
              type="file"
              style={{ display: "none" }}
              onChange={handleUploadNewVersion}
              disabled={loading}
            />
          </label>
        </div>

        {/* Versions List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Current Head Version */}
          <div
            style={{
              padding: "14px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-blue)" }}>
                  Version {file.currentVersion}
                </span>
                <span className="badge badge-blue">Current Head</span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Size: {formatBytes(file.size)} • {new Date(file.updatedAt).toLocaleString()}
              </p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                SHA-256: {file.checksum.substring(0, 16)}...
              </p>
            </div>
            <CheckCircle size={20} color="var(--accent-blue)" />
          </div>

          {/* Historical Versions */}
          {file.versions.map((ver) => (
            <div
              key={ver.versionNumber}
              style={{
                padding: "14px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600 }}>Version {ver.versionNumber}</p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Size: {formatBytes(ver.size)} • {new Date(ver.createdAt).toLocaleString()}
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                  SHA-256: {ver.checksum.substring(0, 16)}...
                </p>
              </div>
              <button
                onClick={() => handleRestore(ver.versionNumber)}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "13px" }}
                disabled={loading}
              >
                <RotateCcw size={14} />
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
