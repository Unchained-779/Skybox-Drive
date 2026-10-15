import React, { useState, useEffect } from "react";
import { Folder as FolderIcon, X, Check, ArrowRight, Home, Loader2, AlertCircle } from "lucide-react";
import { FileItem, FolderItem, FolderSummaryItem } from "../types";
import { api } from "../api";

interface MoveModalProps {
  isOpen: boolean;
  item: FileItem | FolderItem | { ids: string[]; count: number } | null;
  type: "file" | "folder" | "bulk_files";
  onClose: () => void;
  onSuccess: () => void;
}

export const MoveModal: React.FC<MoveModalProps> = ({
  isOpen,
  item,
  type,
  onClose,
  onSuccess
}) => {
  const [folders, setFolders] = useState<FolderSummaryItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFolderId(null);
      setError(null);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await api.getAllFolders();
        setFolders(list);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load folders");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const itemName =
    type === "bulk_files"
      ? `${(item as { count: number }).count} selected files`
      : (item as FileItem | FolderItem).name;

  const currentFolderId =
    type === "file"
      ? (item as FileItem).folderId
      : type === "folder"
      ? (item as FolderItem).parentId
      : null;

  // Cycle prevention check for folders: cannot move into self or any descendant
  const isFolderDisabled = (folderId: string): boolean => {
    if (type !== "folder") return false;
    const movingFolder = item as FolderItem;
    if (folderId === movingFolder._id) return true;
    const targetFolder = folders.find((f) => f._id === folderId);
    if (targetFolder && targetFolder.ancestors.includes(movingFolder._id)) {
      return true;
    }
    return false;
  };

  const handleMove = async () => {
    setSubmitting(true);
    setError(null);

    try {
      if (type === "file") {
        await api.moveFile((item as FileItem)._id, selectedFolderId);
      } else if (type === "folder") {
        await api.moveFolder((item as FolderItem)._id, selectedFolderId);
      } else if (type === "bulk_files") {
        const bulk = item as { ids: string[]; count: number };
        await Promise.all(bulk.ids.map((id) => api.moveFile(id, selectedFolderId)));
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to move item");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Move Item
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", margin: 0 }}>
              Choose a destination folder for <strong style={{ color: "var(--accent-blue)" }}>{itemName}</strong>
            </p>
          </div>
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px"
            }}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 24px", maxHeight: "380px", overflowY: "auto" }}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "var(--radius-sm)",
                color: "#fca5a5",
                fontSize: "13px",
                marginBottom: "16px"
              }}
            >
              <AlertCircle size={16} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px",
                color: "var(--text-muted)",
                gap: "10px"
              }}
            >
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
              <span>Loading folders...</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* Root / My Drive Option */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border:
                    selectedFolderId === null
                      ? "1px solid var(--accent-blue)"
                      : "1px solid var(--border-color)",
                  backgroundColor:
                    selectedFolderId === null
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(20, 30, 51, 0.4)",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
                onClick={() => setSelectedFolderId(null)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Home size={18} color="var(--accent-blue)" />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    My Drive (Root)
                  </span>
                  {currentFolderId === null && (
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 6px",
                        backgroundColor: "rgba(100, 116, 139, 0.2)",
                        color: "var(--text-muted)",
                        borderRadius: "4px"
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
                {selectedFolderId === null && <Check size={16} color="var(--accent-blue)" />}
              </div>

              {/* Folder List */}
              {folders.map((f) => {
                const disabled = isFolderDisabled(f._id);
                const isSelected = selectedFolderId === f._id;
                const isCurrent = currentFolderId === f._id;
                const indent = Math.min((f.ancestors.length || 0) * 14, 56);

                return (
                  <div
                    key={f._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      marginLeft: `${indent}px`,
                      borderRadius: "var(--radius-md)",
                      border: isSelected
                        ? "1px solid var(--accent-blue)"
                        : "1px solid rgba(36, 50, 74, 0.4)",
                      backgroundColor: isSelected
                        ? "rgba(59, 130, 246, 0.15)"
                        : disabled
                        ? "rgba(15, 23, 42, 0.4)"
                        : "rgba(20, 30, 51, 0.3)",
                      opacity: disabled ? 0.45 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      transition: "all 0.15s"
                    }}
                    onClick={() => {
                      if (!disabled) setSelectedFolderId(f._id);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <FolderIcon size={18} color="#38bdf8" />
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: disabled ? "var(--text-muted)" : "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {f.name}
                      </span>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            backgroundColor: "rgba(100, 116, 139, 0.2)",
                            color: "var(--text-muted)",
                            borderRadius: "4px"
                          }}
                        >
                          Current
                        </span>
                      )}
                      {disabled && (
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            color: "#fca5a5",
                            borderRadius: "4px"
                          }}
                        >
                          Invalid
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={16} color="var(--accent-blue)" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            backgroundColor: "rgba(20, 30, 51, 0.5)"
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
            style={{ padding: "8px 16px" }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMove}
            disabled={submitting || loading || selectedFolderId === currentFolderId}
            style={{ padding: "8px 18px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span>Moving...</span>
              </>
            ) : (
              <>
                <span>Move Here</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
