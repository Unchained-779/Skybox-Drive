import React from "react";
import { Cloud, HardDrive, Users, Trash2, Plus, FolderPlus, UploadCloud } from "lucide-react";
import { StorageWidget } from "./StorageWidget";
import { StorageStats } from "../types";

interface SidebarProps {
  currentTab: "my-drive" | "shared-with-me" | "trash";
  onTabChange: (tab: "my-drive" | "shared-with-me" | "trash") => void;
  onOpenNewFolder: () => void;
  onOpenUpload: () => void;
  storageStats: StorageStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenNewFolder,
  onOpenUpload,
  storageStats
}) => {
  const [showNewMenu, setShowNewMenu] = React.useState(false);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)"
          }}
        >
          <Cloud size={22} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Skybox <span style={{ color: "var(--accent-blue)" }}>Drive</span>
          </h1>
          <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Secure Cloud Storage</p>
        </div>
      </div>

      {/* New Button with Dropdown */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <button
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "15px" }}
          onClick={() => setShowNewMenu(!showNewMenu)}
        >
          <Plus size={18} />
          <span>New</span>
        </button>

        {showNewMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "6px",
              boxShadow: "var(--shadow-card)",
              zIndex: 50
            }}
          >
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "14px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              onClick={() => {
                setShowNewMenu(false);
                onOpenUpload();
              }}
            >
              <UploadCloud size={16} color="var(--accent-blue)" />
              File Upload
            </button>
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                background: "none",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "14px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              onClick={() => {
                setShowNewMenu(false);
                onOpenNewFolder();
              }}
            >
              <FolderPlus size={16} color="#fbbf24" />
              New Folder
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: currentTab === "my-drive" ? "rgba(59, 130, 246, 0.15)" : "transparent",
            color: currentTab === "my-drive" ? "var(--accent-blue)" : "var(--text-secondary)",
            fontWeight: currentTab === "my-drive" ? 600 : 500,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s"
          }}
          onClick={() => onTabChange("my-drive")}
        >
          <HardDrive size={18} />
          My Drive
        </button>

        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor:
              currentTab === "shared-with-me" ? "rgba(59, 130, 246, 0.15)" : "transparent",
            color: currentTab === "shared-with-me" ? "var(--accent-blue)" : "var(--text-secondary)",
            fontWeight: currentTab === "shared-with-me" ? 600 : 500,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s"
          }}
          onClick={() => onTabChange("shared-with-me")}
        >
          <Users size={18} />
          Shared with me
        </button>

        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: currentTab === "trash" ? "rgba(239, 68, 68, 0.15)" : "transparent",
            color: currentTab === "trash" ? "#f87171" : "var(--text-secondary)",
            fontWeight: currentTab === "trash" ? 600 : 500,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s"
          }}
          onClick={() => onTabChange("trash")}
        >
          <Trash2 size={18} />
          Trash
        </button>
      </nav>

      {/* Storage Breakdown Widget */}
      <StorageWidget stats={storageStats} />
    </aside>
  );
};
