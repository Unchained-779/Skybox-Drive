import React, { useState } from "react";
import { X, UploadCloud } from "lucide-react";
import { api } from "../api";

interface UploadModalProps {
  currentFolderId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ currentFolderId, onClose, onRefresh }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragHover, setIsDragHover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      await api.uploadFile(file, currentFolderId);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <UploadCloud size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Upload File</h3>
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

        <form onSubmit={handleUpload}>
          <div
            style={{
              padding: "36px 16px",
              border: `2px dashed ${isDragHover ? "var(--accent-blue)" : "var(--border-color)"}`,
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              backgroundColor: isDragHover ? "rgba(59, 130, 246, 0.1)" : "var(--bg-card)",
              marginBottom: "20px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
            onClick={() => document.getElementById("file-input")?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragHover(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragHover(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragHover(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <UploadCloud size={36} color="var(--accent-blue)" style={{ margin: "0 auto 10px" }} />
            <p style={{ fontSize: "14px", fontWeight: 600 }}>
              {file ? file.name : "Choose a file or drag it here"}
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports any file format up to remaining quota"}
            </p>
            <input
              id="file-input"
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!file || loading}>
              {loading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
