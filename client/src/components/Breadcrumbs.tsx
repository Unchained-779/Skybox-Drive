import React from "react";
import { ChevronRight, HardDrive } from "lucide-react";
import { Breadcrumb } from "../types";

interface BreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (folderId: string | null) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ breadcrumbs, onNavigate }) => {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "20px",
        overflowX: "auto",
        whiteSpace: "nowrap",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "4px"
      }}
    >
      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.id || "root"}>
            <button
              onClick={() => onNavigate(crumb.id)}
              disabled={isLast}
              style={{
                background: "none",
                border: "none",
                color: isLast ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: isLast ? 700 : 500,
                fontSize: isLast ? "20px" : "15px",
                cursor: isLast ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                transition: "color 0.2s"
              }}
              onMouseEnter={(e) => {
                if (!isLast) e.currentTarget.style.color = "var(--accent-blue)";
              }}
              onMouseLeave={(e) => {
                if (!isLast) e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {idx === 0 && <HardDrive size={18} />}
              {crumb.name}
            </button>
            {!isLast && <ChevronRight size={16} color="var(--text-muted)" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
