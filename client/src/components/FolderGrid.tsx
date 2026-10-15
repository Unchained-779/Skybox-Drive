import React from "react";
import { Folder as FolderIcon, MoreVertical, Share2, Edit2, Trash2, Users, FolderInput } from "lucide-react";
import { FolderItem } from "../types";

interface FolderGridProps {
  folders: FolderItem[];
  onOpenFolder: (folderId: string) => void;
  onShare: (folder: FolderItem) => void;
  onRename: (folder: FolderItem) => void;
  onMove?: (folder: FolderItem) => void;
  onDelete: (folderId: string) => void;
}

export const FolderGrid: React.FC<FolderGridProps> = ({
  folders,
  onOpenFolder,
  onShare,
  onRename,
  onMove,
  onDelete
}) => {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  if (folders.length === 0) return null;

  return (
    <div style={{ marginBottom: "32px" }}>
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
        Folders
      </h3>

      <div className="folder-grid">
        {folders.map((folder) => {
          const isShared = folder.sharedWith && folder.sharedWith.length > 0;
          return (
            <div
              key={folder._id}
              style={{
                position: "relative",
                padding: "16px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onClick={() => onOpenFolder(folder._id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                e.currentTarget.style.borderColor = "#334155";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <FolderIcon size={24} color="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                    title={folder.name}
                  >
                    {folder.name}
                  </p>
                  {isShared && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: "var(--accent-blue)",
                        marginTop: "2px"
                      }}
                    >
                      <Users size={12} />
                      <span>Shared</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Menu */}
              <div
                style={{ position: "relative" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === folder._id ? null : folder._id);
                }}
              >
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    padding: "6px",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <MoreVertical size={16} />
                </button>

                {activeMenuId === folder._id && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "100%",
                      width: "160px",
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      padding: "6px",
                      boxShadow: "var(--shadow-card)",
                      zIndex: 30
                    }}
                  >
                    <button
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        background: "none",
                        border: "none",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(null);
                        onShare(folder);
                      }}
                    >
                      <Share2 size={14} />
                      Share
                    </button>
                    <button
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        background: "none",
                        border: "none",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(null);
                        onRename(folder);
                      }}
                    >
                      <Edit2 size={14} />
                      Rename
                    </button>
                    {onMove && (
                      <button
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          background: "none",
                          border: "none",
                          color: "var(--text-primary)",
                          fontSize: "13px",
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          textAlign: "left"
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onMove(folder);
                        }}
                      >
                        <FolderInput size={14} />
                        Move
                      </button>
                    )}
                    <button
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        background: "none",
                        border: "none",
                        color: "#f87171",
                        fontSize: "13px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(null);
                        onDelete(folder._id);
                      }}
                    >
                      <Trash2 size={14} />
                      Move to trash
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
