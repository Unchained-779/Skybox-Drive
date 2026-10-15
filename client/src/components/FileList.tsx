import React, { useState, useMemo } from "react";
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
  Users,
  Eye,
  Edit2,
  FolderInput,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from "lucide-react";
import { FileItem } from "../types";
import { api } from "../api";

interface FileListProps {
  files: FileItem[];
  onDownload: (file: FileItem) => void;
  onOpenVersions: (file: FileItem) => void;
  onShare: (file: FileItem) => void;
  onDelete: (fileId: string) => void;
  onRename: (file: FileItem) => void;
  onMove: (file: FileItem) => void;
  onPreview: (file: FileItem) => void;
  onBulkMove?: (fileIds: string[]) => void;
  onBulkDelete?: (fileIds: string[]) => void;
  onOpenUpload?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const getFileIcon = (mimeType: string, size: number = 20) => {
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/")) return <ImageIcon size={size} color="#10b981" />;
  if (mime.startsWith("video/")) return <Film size={size} color="#ec4899" />;
  if (mime.startsWith("audio/")) return <Music size={size} color="#a855f7" />;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text"))
    return <FileText size={size} color="#3b82f6" />;
  if (mime.includes("json") || mime.includes("javascript") || mime.includes("typescript"))
    return <FileCode size={size} color="#f59e0b" />;
  return <GenericFile size={size} color="#94a3b8" />;
};

export const FileList: React.FC<FileListProps> = ({
  files,
  onDownload,
  onOpenVersions,
  onShare,
  onDelete,
  onRename,
  onMove,
  onPreview,
  onBulkMove,
  onBulkDelete,
  onOpenUpload
}) => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"name" | "size" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Toggle sorting column
  const handleSort = (column: "name" | "size" | "updatedAt") => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Sort files memo
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      } else if (sortBy === "updatedAt") {
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [files, sortBy, sortOrder]);

  // Selection handlers
  const handleToggleSelect = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map((f) => f._id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedFileIds(new Set());
  };

  const handleBulkDownload = () => {
    const selectedFiles = files.filter((f) => selectedFileIds.has(f._id));
    selectedFiles.forEach((file) => onDownload(file));
  };

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

  const allSelected = files.length > 0 && selectedFileIds.size === files.length;

  return (
    <div>
      {/* Top Controls: Title, Count, and View Mode Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0
            }}
          >
            Files
          </h3>
          <span
            style={{
              fontSize: "12px",
              padding: "2px 8px",
              borderRadius: "10px",
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "var(--text-muted)"
            }}
          >
            {files.length}
          </span>
        </div>

        {/* View Switcher Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-color)",
            padding: "2px"
          }}
        >
          <button
            onClick={() => setViewMode("list")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: 500,
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: viewMode === "list" ? "var(--accent-blue)" : "transparent",
              color: viewMode === "list" ? "#ffffff" : "var(--text-muted)",
              transition: "all 0.15s ease"
            }}
            title="List View"
          >
            <List size={14} />
            <span>List</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: 500,
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              backgroundColor: viewMode === "grid" ? "var(--accent-blue)" : "transparent",
              color: viewMode === "grid" ? "#ffffff" : "var(--text-muted)",
              transition: "all 0.15s ease"
            }}
            title="Grid View"
          >
            <LayoutGrid size={14} />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: TABLE LIST VIEW */}
      {viewMode === "list" && (
        <div className="file-table-container">
          <div className="file-table-grid" style={{ minWidth: "750px" }}>
            {/* Table Header with Sortable Columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "36px 3fr 1fr 1.5fr 1.2fr 1.4fr 220px",
                padding: "12px 18px",
                borderBottom: "1px solid var(--border-color)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                alignItems: "center"
              }}
            >
              <div>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  title="Select all files"
                />
              </div>

              {/* Sort by Name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
                onClick={() => handleSort("name")}
              >
                <span>Name</span>
                {sortBy === "name" ? (
                  sortOrder === "asc" ? <ArrowUp size={12} color="var(--accent-blue)" /> : <ArrowDown size={12} color="var(--accent-blue)" />
                ) : (
                  <ArrowUpDown size={12} opacity={0.4} />
                )}
              </div>

              {/* Sort by Size */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
                onClick={() => handleSort("size")}
              >
                <span>Size</span>
                {sortBy === "size" ? (
                  sortOrder === "asc" ? <ArrowUp size={12} color="var(--accent-blue)" /> : <ArrowDown size={12} color="var(--accent-blue)" />
                ) : (
                  <ArrowUpDown size={12} opacity={0.4} />
                )}
              </div>

              {/* Sort by Last Modified */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
                onClick={() => handleSort("updatedAt")}
              >
                <span>Last Modified</span>
                {sortBy === "updatedAt" ? (
                  sortOrder === "asc" ? <ArrowUp size={12} color="var(--accent-blue)" /> : <ArrowDown size={12} color="var(--accent-blue)" />
                ) : (
                  <ArrowUpDown size={12} opacity={0.4} />
                )}
              </div>

              <span>Version</span>
              <span>Owner</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>

            {/* Rows */}
            {sortedFiles.map((file) => {
              const isShared = file.sharedWith && file.sharedWith.length > 0;
              const isSelected = selectedFileIds.has(file._id);

              return (
                <div
                  key={file._id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 3fr 1fr 1.5fr 1.2fr 1.4fr 220px",
                    padding: "12px 18px",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(36, 50, 74, 0.4)",
                    fontSize: "14px",
                    backgroundColor: isSelected ? "rgba(59, 130, 246, 0.08)" : "transparent",
                    transition: "background-color 0.15s"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Select Checkbox */}
                  <div>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(file._id)}
                    />
                  </div>

                  {/* Name & Icon with Click-to-Preview */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minWidth: 0,
                      cursor: "pointer"
                    }}
                    onClick={() => onPreview(file)}
                    title="Click to preview file"
                  >
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

                  {/* Last Modified */}
                  <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                    {formatDate(file.updatedAt)}
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
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                    title={file.ownerId?.email}
                  >
                    {file.ownerId?.name || "Unknown"}
                  </span>

                  {/* Action Buttons: Preview, Download, History, Share, Rename, Move, Trash */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "5px"
                    }}
                  >
                    <button
                      onClick={() => onPreview(file)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 8px" }}
                      title="Preview File"
                    >
                      <Eye size={14} color="#38bdf8" />
                    </button>
                    <button
                      onClick={() => onDownload(file)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 8px" }}
                      title="Download File"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => onRename(file)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 8px" }}
                      title="Rename File"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onMove(file)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 8px" }}
                      title="Move File"
                    >
                      <FolderInput size={14} />
                    </button>
                    <button
                      onClick={() => onShare(file)}
                      className="btn btn-secondary"
                      style={{ padding: "6px 8px" }}
                      title="Share File"
                    >
                      <Share2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(file._id)}
                      className="btn btn-danger"
                      style={{ padding: "6px 8px" }}
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
      )}

      {/* VIEW 2: GRID CARD VIEW */}
      {viewMode === "grid" && (
        <div className="file-card-grid">
          {sortedFiles.map((file) => {
            const isSelected = selectedFileIds.has(file._id);
            const isImage = file.mimeType.toLowerCase().startsWith("image/");
            const previewUrl = api.getPreviewUrl(file._id, file.currentVersion);

            return (
              <div
                key={file._id}
                className={`file-card ${isSelected ? "selected" : ""}`}
                onClick={() => onPreview(file)}
              >
                {/* Checkbox Overlay in Card Top-Left */}
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "10px",
                    zIndex: 2
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelect(file._id);
                  }}
                >
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                  />
                </div>

                {/* Card Thumbnail Area */}
                <div
                  style={{
                    height: "120px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(11, 17, 32, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.05)"
                  }}
                >
                  {isImage ? (
                    <img
                      src={previewUrl}
                      alt={file.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    getFileIcon(file.mimeType, 42)
                  )}
                </div>

                {/* Card Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      margin: 0
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </h4>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginTop: "6px"
                    }}
                  >
                    <span>{formatBytes(file.size)}</span>
                    <span>{formatDate(file.updatedAt)}</span>
                  </div>
                </div>

                {/* Card Quick Actions Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "12px",
                    paddingTop: "10px",
                    borderTop: "1px solid rgba(36, 50, 74, 0.5)"
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className="badge badge-blue"
                    style={{ fontSize: "10px", padding: "2px 6px" }}
                  >
                    v{file.currentVersion}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      onClick={() => onDownload(file)}
                      className="btn btn-secondary"
                      style={{ padding: "4px 6px" }}
                      title="Download"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => onRename(file)}
                      className="btn btn-secondary"
                      style={{ padding: "4px 6px" }}
                      title="Rename"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => onMove(file)}
                      className="btn btn-secondary"
                      style={{ padding: "4px 6px" }}
                      title="Move"
                    >
                      <FolderInput size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(file._id)}
                      className="btn btn-danger"
                      style={{ padding: "4px 6px" }}
                      title="Trash"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING ACTION BAR FOR MULTI-SELECTION */}
      {selectedFileIds.size > 0 && (
        <div className="floating-action-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                backgroundColor: "var(--accent-blue)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px"
              }}
            >
              {selectedFileIds.size}
            </span>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>
              {selectedFileIds.size === 1 ? "file selected" : "files selected"}
            </span>
          </div>

          <div
            style={{
              height: "20px",
              width: "1px",
              backgroundColor: "rgba(255, 255, 255, 0.2)"
            }}
          />

          <button
            className="btn btn-secondary"
            onClick={handleBulkDownload}
            style={{ padding: "6px 12px", fontSize: "13px" }}
          >
            <Download size={14} />
            <span>Download</span>
          </button>

          {onBulkMove && (
            <button
              className="btn btn-secondary"
              onClick={() => onBulkMove(Array.from(selectedFileIds))}
              style={{ padding: "6px 12px", fontSize: "13px" }}
            >
              <FolderInput size={14} />
              <span>Move</span>
            </button>
          )}

          {onBulkDelete && (
            <button
              className="btn btn-danger"
              onClick={() => onBulkDelete(Array.from(selectedFileIds))}
              style={{ padding: "6px 12px", fontSize: "13px" }}
            >
              <Trash2 size={14} />
              <span>Trash</span>
            </button>
          )}

          <button
            onClick={handleClearSelection}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center"
            }}
            title="Clear selection"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
