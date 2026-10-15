import React, { useState, useEffect } from "react";
import { Download, Cloud, FileText, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { api } from "../api";
import { FileItem } from "../types";

interface PublicShareViewProps {
  token: string;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<FileItem | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const fetchSharedItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.resolveShareLink(token);
        if (res.link.resourceType === "file") {
          setFile(res.resource);
        } else {
          setError("Folder public preview is currently viewed through Skybox Drive.");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Invalid or expired share link.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedItem();
  }, [token]);

  const handleDownload = async () => {
    if (!file) return;
    setDownloading(true);
    try {
      await api.downloadSharedFile(token, file.name);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-main)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "var(--font-sans)"
      }}
    >
      {/* Top Navbar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "64px",
          backgroundColor: "var(--bg-sidebar)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "var(--accent-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
            }}
          >
            <Cloud size={22} color="#ffffff" />
          </div>
          <span style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Skybox <span style={{ color: "var(--accent-blue)" }}>Drive</span>
          </span>
        </div>

        <a
          href="/"
          className="btn btn-secondary"
          style={{ fontSize: "13px", padding: "8px 14px", textDecoration: "none" }}
        >
          <ArrowLeft size={14} /> Go to Drive
        </a>
      </div>

      {/* Main Card */}
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "36px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}
      >
        {loading && (
          <div style={{ padding: "40px 0" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid var(--border-color)",
                borderTopColor: "var(--accent-blue)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 16px auto"
              }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading shared document...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: "20px 0" }}>
            <AlertCircle size={48} color="#ef4444" style={{ margin: "0 auto 16px auto" }} />
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>
              Unable to Open Document
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
              {error}
            </p>
            <a href="/" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
              Return to Skybox Drive
            </a>
          </div>
        )}

        {file && !loading && (
          <div>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "16px",
                backgroundColor: "rgba(59, 130, 246, 0.12)",
                color: "var(--accent-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto"
              }}
            >
              <FileText size={38} />
            </div>

            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "var(--accent-blue)",
                marginBottom: "12px"
              }}
            >
              Public Document
            </span>

            <h2
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "8px",
                wordBreak: "break-word"
              }}
            >
              {file.name}
            </h2>

            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
              {formatBytes(file.size)} • {file.mimeType || "application/octet-stream"}
            </p>

            {file.ownerId && (
              <div
                style={{
                  backgroundColor: "var(--bg-main)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <span>Shared by:</span>
                <strong style={{ color: "var(--text-primary)" }}>
                  {typeof file.ownerId === "object" ? file.ownerId.name || file.ownerId.email : "Skybox User"}
                </strong>
              </div>
            )}

            <button
              onClick={handleDownload}
              className="btn btn-primary"
              disabled={downloading}
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "15px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 size={18} color="#34d399" />
                  Downloaded Successfully!
                </>
              ) : (
                <>
                  <Download size={18} />
                  {downloading ? "Preparing Download..." : "Download File"}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
