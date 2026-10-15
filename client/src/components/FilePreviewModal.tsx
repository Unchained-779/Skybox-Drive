import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
  File as GenericFile,
  Loader2,
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import { FileItem } from "../types";
import { api } from "../api";

interface FilePreviewModalProps {
  file: FileItem | null;
  onClose: () => void;
  onDownload: (file: FileItem) => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onDownload
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!file) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [file, onClose]);

  useEffect(() => {
    if (!file) {
      setBlobUrl(null);
      setTextContent(null);
      setError(null);
      return;
    }

    let activeObjectUrl: string | null = null;
    let isCancelled = false;

    const loadContent = async () => {
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      setTextContent(null);

      try {
        const { blob, url } = await api.getFileBlob(file._id, file.currentVersion);
        if (isCancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        activeObjectUrl = url;
        setBlobUrl(url);

        const mime = file.mimeType.toLowerCase();
        const isText =
          mime.startsWith("text/") ||
          mime.includes("json") ||
          mime.includes("javascript") ||
          mime.includes("typescript") ||
          mime.includes("xml") ||
          mime.includes("csv");

        if (isText) {
          const text = await blob.text();
          if (!isCancelled) setTextContent(text);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file preview");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadContent();

    return () => {
      isCancelled = true;
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [file]);

  if (!file) return null;

  const mime = file.mimeType.toLowerCase();
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isPdf = mime.includes("pdf");
  const isText =
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("xml") ||
    mime.includes("csv");

  const isStorageNotFoundError =
    error && (error.toLowerCase().includes("not found on storage") || error.includes("404"));

  const handleCopyText = () => {
    if (textContent) {
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        backgroundColor: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(10px)",
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
          maxWidth: isPdf ? "980px" : isImage || isVideo ? "920px" : "780px",
          maxHeight: "92vh",
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
        {/* Header Bar */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(20, 30, 51, 0.6)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            {isImage && <ImageIcon size={22} color="#10b981" />}
            {isVideo && <Film size={22} color="#ec4899" />}
            {isAudio && <Music size={22} color="#a855f7" />}
            {isPdf && <FileText size={22} color="#3b82f6" />}
            {isText && <FileCode size={22} color="#f59e0b" />}
            {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
              <GenericFile size={22} color="#94a3b8" />
            )}
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  fontSize: "15px",
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
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "2px"
                }}
              >
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span>v{file.currentVersion}</span>
                <span>•</span>
                <span style={{ textTransform: "uppercase" }}>
                  {file.mimeType.split("/")[1] || "FILE"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            {isText && textContent && (
              <button
                className="btn btn-secondary"
                style={{ padding: "8px 12px", fontSize: "13px" }}
                onClick={handleCopyText}
                title="Copy text"
              >
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            )}
            <button
              className="btn btn-primary"
              style={{ padding: "8px 14px", fontSize: "13px" }}
              onClick={() => onDownload(file)}
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <button
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Viewer Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            backgroundColor: "#080c14",
            minHeight: "360px"
          }}
        >
          {/* Loading State */}
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                color: "var(--text-muted)"
              }}
            >
              <Loader2 size={36} color="var(--accent-blue)" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "14px" }}>Loading file preview...</span>
            </div>
          )}

          {/* Error State with clear explanation */}
          {!loading && error && (
            <div
              style={{
                maxWidth: "460px",
                textAlign: "center",
                padding: "32px 20px"
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}
              >
                <AlertCircle size={32} color="#ef4444" />
              </div>
              <h4 style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff", marginBottom: "8px" }}>
                Preview Unavailable
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "#fca5a5",
                  marginBottom: isStorageNotFoundError ? "12px" : "20px",
                  lineHeight: "1.5"
                }}
              >
                {error}
              </p>

              {isStorageNotFoundError && (
                <div
                  style={{
                    backgroundColor: "rgba(30, 41, 59, 0.7)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                    marginBottom: "20px",
                    textAlign: "left"
                  }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>Why did this happen?</strong>
                  <br />
                  Free cloud instances (Render) run on temporary ephemeral storage that resets whenever a new version is deployed. Any files uploaded prior to a redeployment need to be re-uploaded.
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{ padding: "8px 16px" }}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => onDownload(file)}
                  style={{ padding: "8px 16px" }}
                >
                  <Download size={14} />
                  <span>Try Download</span>
                </button>
              </div>
            </div>
          )}

          {/* Success: Image Preview */}
          {!loading && !error && isImage && blobUrl && (
            <img
              src={blobUrl}
              alt={file.name}
              style={{
                maxWidth: "100%",
                maxHeight: "72vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
              }}
            />
          )}

          {/* Success: Video Preview */}
          {!loading && !error && isVideo && blobUrl && (
            <video
              src={blobUrl}
              controls
              autoPlay
              style={{
                maxWidth: "100%",
                maxHeight: "72vh",
                borderRadius: "8px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
              }}
            />
          )}

          {/* Success: Audio Preview */}
          {!loading && !error && isAudio && blobUrl && (
            <div
              style={{
                padding: "48px 32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
                maxWidth: "500px"
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "20px"
                }}
              >
                <Music size={40} color="#a855f7" />
              </div>
              <h4 style={{ fontSize: "16px", color: "var(--text-primary)", marginBottom: "16px" }}>
                {file.name}
              </h4>
              <audio src={blobUrl} controls autoPlay style={{ width: "100%" }} />
            </div>
          )}

          {/* Success: PDF Preview */}
          {!loading && !error && isPdf && blobUrl && (
            <iframe
              src={blobUrl}
              title={file.name}
              style={{
                width: "100%",
                height: "72vh",
                border: "none",
                borderRadius: "8px"
              }}
            />
          )}

          {/* Success: Text / Code Preview */}
          {!loading && !error && isText && (
            <div style={{ width: "100%", height: "100%" }}>
              <pre
                style={{
                  backgroundColor: "#0d1322",
                  padding: "20px",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontFamily: "Consolas, Monaco, 'Courier New', monospace",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  overflowX: "auto",
                  maxHeight: "68vh",
                  border: "1px solid var(--border-color)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                {textContent || "Empty file"}
              </pre>
            </div>
          )}

          {/* Success: Unsupported File Type Fallback */}
          {!loading && !error && !isImage && !isVideo && !isAudio && !isPdf && !isText && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                maxWidth: "420px"
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(100, 116, 139, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px"
                }}
              >
                <GenericFile size={36} color="var(--text-muted)" />
              </div>
              <h4
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px"
                }}
              >
                Preview Not Available
              </h4>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "24px",
                  lineHeight: "1.5"
                }}
              >
                This file format cannot be previewed directly in the browser. You can download it to view it with your local software.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => onDownload(file)}
                style={{ padding: "10px 24px" }}
              >
                <Download size={16} />
                <span>Download File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
