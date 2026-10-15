import React from "react";
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  File as GenericFile,
  Download,
  History,
  Share2,
  Trash2,
  Users
} from "lucide-react";
import { FileItem } from "../types";

interface FileListProps {
  files: FileItem[];
  onDownload: (file: FileItem) => void;
  onOpenVersions: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDelete: (fileId: string) => void;
  onOpenUpload?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (mimeType: string) => {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return <ImageIcon size={20} color="#10b981" />;
  if (mime.startsWith("video/")) return <Film size={20} color="#ec4899" />;
  if (mime.startsWith("audio/")) return <Music size={20} color="#a855f7" />;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text"))
    return <FileText size={20} color="#3b82f6" />;
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("typescript"))
    return <FileCode size={20} color="#f59e0b" />;
  return <GenericFile size={20} color="#94a3b8" />;
};

export const FileList: React.FC<FileListProps> = ({
  files,
  onDownload,
  onOpenVersions,
  onShare,
  onDelete,
  onOpenUpload
}) => {
  if (files.length === 0) {
    return (
      <div
        onClick={onOpenUpload}
        style={{
          padding: "48px 16px",
          textAlign: "center",
          color: "var(--text-muted)",
          backgroundColor: "rgba(20, 30, 51, 0.4)",
          borderRadius: "var(--radius-lg)",
          border: "2px dashed var(--border-color)",
          cursor: onOpenUpload ? "pointer" : "default",
          transition: "all 0.2s ease"
        }}
      >
        <GenericFile size={40} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
        <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-secondary)" }}>
          No files in this folder
        </p>
        <p style={{ fontSize: "13px", marginTop: "4px" }}>
          Click to upload or drag & drop files anywhere on the page
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "16px"
        }}
      >
        Files
      </h3>

      <div
        style={{
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-secondary)",
          overflow: "hidden"
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr 1.5fr 1.5fr 180px",
            padding: "12px 20px",
            borderBottom: "1px solid var(--border-color)",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase"
          }}
        >
          <span>Name</span>
          <span>Size</span>
          <span>Version</span>
          <span>Owner</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {/* Rows */}
        {files.map((file) => {
          const isShared = file.sharedWith && file.sharedWith.length > 0;
          return (
            <div
              key={file._id}
              style={{
                display: "grid",
                gridTemplateColumns: "3fr 1fr 1.5fr 1.5fr 180px",
                padding: "14px 20px",
                alignItems: "center",
                borderBottom: "1px solid rgba(36, 50, 74, 0.4)",
                fontSize: "14px",
                transition: "background-color 0.15s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {/* Name & Icon */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                {getFileIcon(file.mimeType)}
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "block"
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  {isShared && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "var(--accent-blue)"
                      }}
                    >
                      <Users size={11} />
                      <span>Shared</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Size */}
              <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                {formatBytes(file.size)}
              </span>

              {/* Version Badge */}
              <div>
                <button
                  onClick={() => onOpenVersions(file)}
                  className="badge badge-blue"
                  style={{
                    cursor: "pointer",
                    border: "none",
                    gap: "4px",
                    display: "inline-flex",
                    alignItems: "center"
                  }}
                  title="Click to view version history"
                >
                  <History size={11} />
                  v{file.currentVersion}
                  {file.versions.length > 0 && ` (${file.versions.length + 1})`}
                </button>
              </div>

              {/* Owner */}
              <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                {file.ownerId?.name || "Unknown"}
              </span>

              {/* Action Buttons */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "6px"
                }}
              >
                <button
                  onClick={() => onDownload(file)}
                  className="btn btn-secondary"
                  style={{ padding: "6px 10px" }}
                  title="Download File"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => onOpenVersions(file)}
                  className="btn btn-secondary"
                  style={{ padding: "6px 10px" }}
                  title="Version History"
                >
                  <History size={14} />
                </button>
                <button
                  onClick={() => onShare(file)}
                  className="btn btn-secondary"
                  style={{ padding: "6px 10px" }}
                  title="Share File"
                >
                  <Share2 size={14} />
                </button>
                <button
                  onClick={() => onDelete(file._id)}
                  className="btn btn-danger"
                  style={{ padding: "6px 10px" }}
                  title="Move to Trash"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
