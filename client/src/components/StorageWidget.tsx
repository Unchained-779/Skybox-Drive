import React from "react";
import { StorageStats } from "../types";
import { HardDrive } from "lucide-react";

interface StorageWidgetProps {
  stats: StorageStats | null;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const StorageWidget: React.FC<StorageWidgetProps> = ({ stats }) => {
  if (!stats) return null;

  const usedFormatted = formatBytes(stats.usedStorage);
  const quotaFormatted = formatBytes(stats.storageQuota);
  const percentage = Math.min(100, stats.percentageUsed);

  return (
    <div
      style={{
        marginTop: "auto",
        padding: "16px",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-color)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <HardDrive size={16} color="var(--accent-blue)" />
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
          Storage
        </span>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: "100%",
          height: "6px",
          backgroundColor: "#1e293b",
          borderRadius: "9999px",
          overflow: "hidden",
          marginBottom: "8px"
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor:
              percentage > 90
                ? "var(--accent-red)"
                : percentage > 75
                ? "var(--accent-amber)"
                : "var(--accent-blue)",
            borderRadius: "9999px",
            transition: "width 0.3s ease"
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "var(--text-secondary)",
          marginBottom: "12px"
        }}
      >
        <span>{usedFormatted} used</span>
        <span>{quotaFormatted} total</span>
      </div>

      {/* Breakdown Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "11px" }}>
        {stats.breakdown.documents.count > 0 && (
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa"
            }}
          >
            Docs: {formatBytes(stats.breakdown.documents.bytes)}
          </span>
        )}
        {stats.breakdown.images.count > 0 && (
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#34d399"
            }}
          >
            Images: {formatBytes(stats.breakdown.images.bytes)}
          </span>
        )}
        {stats.breakdown.others.count > 0 && (
          <span
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "rgba(148, 163, 184, 0.15)",
              color: "#94a3b8"
            }}
          >
            Others: {formatBytes(stats.breakdown.others.bytes)}
          </span>
        )}
      </div>
    </div>
  );
};
