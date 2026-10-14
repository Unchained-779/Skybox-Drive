import React from "react";
import { Trash2, RotateCcw, Folder as FolderIcon, File as GenericFile } from "lucide-react";
import { FolderItem, FileItem } from "../types";
import { api } from "../api";

interface TrashViewProps {
  folders: FolderItem[];
  files: FileItem[];
  onRefresh: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const TrashView: React.FC<TrashViewProps> = ({ folders, files, onRefresh }) => {
  const [loading, setLoading] = React.useState(false);

  const handleRestore = async (type: "file" | "folder", id: string) => {
    setLoading(true);
    try {
      await api.restoreTrash(type, id);
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all items in trash? This cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      await api.emptyTrash();
      onRefresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to empty trash");
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = folders.length === 0 && files.length === 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px"
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Trash</h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Items in trash can be restored or permanently cleared to free quota.
          </p>
        </div>
        {!isEmpty && (
          <button
            onClick={handleEmptyTrash}
            className="btn btn-danger"
            disabled={loading}
          >
            <Trash2 size={16} />
            Empty Trash
          </button>
        )}
      </div>

      {isEmpty ? (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
            backgroundColor: "rgba(20, 30, 51, 0.4)",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-color)"
          }}
        >
          <Trash2 size={44} style={{ margin: "0 auto 14px", opacity: 0.4 }} />
          <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>
            Trash is empty
          </p>
          <p style={{ fontSize: "13px", marginTop: "4px" }}>
            Deleted folders and files will appear here until permanently cleared.
          </p>
        </div>
      ) : (
        <div
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-secondary)",
            overflow: "hidden"
          }}
        >
          {folders.map((folder) => (
            <div
              key={folder._id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid rgba(36, 50, 74, 0.4)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <FolderIcon size={20} color="#f59e0b" />
                <span style={{ fontWeight: 500 }}>{folder.name}</span>
                <span className="badge badge-blue">Folder</span>
              </div>
              <button
                onClick={() => handleRestore("folder", folder._id)}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "13px" }}
                disabled={loading}
              >
                <RotateCcw size={14} />
                Restore
              </button>
            </div>
          ))}

          {files.map((file) => (
            <div
              key={file._id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid rgba(36, 50, 74, 0.4)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <GenericFile size={20} color="#94a3b8" />
                <div>
                  <p style={{ fontWeight: 500 }}>{file.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {formatBytes(file.size)} • v{file.currentVersion}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRestore("file", file._id)}
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
      )}
    </div>
  );
};
