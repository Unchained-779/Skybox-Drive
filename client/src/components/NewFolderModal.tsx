import React, { useState } from "react";
import { X, FolderPlus } from "lucide-react";
import { api } from "../api";

interface NewFolderModalProps {
  currentFolderId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  currentFolderId,
  onClose,
  onRefresh
}) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.createFolder(name.trim(), currentFolderId);
      onRefresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
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
            <FolderPlus size={20} color="#f59e0b" />
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>New Folder</h3>
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

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Folder Name"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
            style={{ marginBottom: "20px" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
