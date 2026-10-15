import React, { useState, useEffect, useCallback } from "react";
import { Mail, X } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { FolderGrid } from "./components/FolderGrid";
import { FileList } from "./components/FileList";
import { ShareModal } from "./components/ShareModal";
import { VersionDrawer } from "./components/VersionDrawer";
import { UploadModal } from "./components/UploadModal";
import { NewFolderModal } from "./components/NewFolderModal";
import { TrashView } from "./components/TrashView";
import { AuthModal } from "./components/AuthModal";
import { EmailViewerModal } from "./components/EmailViewerModal";
import { NotificationModal } from "./components/NotificationModal";
import { api, getAuthToken, removeAuthToken } from "./api";
import {
  User,
  StorageStats,
  FolderContentsResponse,
  FolderItem,
  FileItem,
  AuthSuccessResult,
  WelcomeEmail,
  SecurityNotificationItem
} from "./types";

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<"my-drive" | "shared-with-me" | "trash">("my-drive");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Data State
  const [folderData, setFolderData] = useState<FolderContentsResponse | null>(null);
  const [sharedData, setSharedData] = useState<{ folders: FolderItem[]; files: FileItem[] }>({
    folders: [],
    files: []
  });
  const [trashData, setTrashData] = useState<{ folders: FolderItem[]; files: FileItem[] }>({
    folders: [],
    files: []
  });
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  // Notifications & Email Viewer State
  const [notifications, setNotifications] = useState<SecurityNotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [activeEmailToView, setActiveEmailToView] = useState<WelcomeEmail | SecurityNotificationItem | null>(null);
  const [welcomeToast, setWelcomeToast] = useState<{ email: WelcomeEmail; visible: boolean } | null>(null);

  // Modal / Drawer State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ item: FolderItem | FileItem; type: "file" | "folder" } | null>(null);
  const [versionTarget, setVersionTarget] = useState<FileItem | null>(null);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadNotificationsCount(res.unreadCount);
    } catch {
      // Ignore background fetch failure
    }
  }, []);

  // Check Auth on Mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const currentUser = await api.getMe();
        setUser(currentUser);
        fetchNotifications();
      } catch {
        removeAuthToken();
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    initAuth();
  }, [fetchNotifications]);

  // Fetch Storage Stats
  const refreshStorageStats = useCallback(async () => {
    try {
      const stats = await api.getStorageStats();
      setStorageStats(stats);
    } catch {
      // Ignore in background
    }
  }, []);

  // Fetch Main Content
  const refreshContent = useCallback(async () => {
    if (!user) return;

    try {
      if (currentTab === "my-drive") {
        const data = await api.listFolder(currentFolderId, searchQuery);
        setFolderData(data);
      } else if (currentTab === "shared-with-me") {
        const data = await api.getSharedWithMe();
        setSharedData(data);
      } else if (currentTab === "trash") {
        const data = await api.listTrash();
        setTrashData(data);
      }
      refreshStorageStats();
      fetchNotifications();
    } catch (err: unknown) {
      console.error("Failed to load drive content:", err);
    }
  }, [user, currentTab, currentFolderId, searchQuery, refreshStorageStats, fetchNotifications]);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    setWelcomeToast(null);
    setNotifications([]);
    setUnreadNotificationsCount(0);
  };

  const handleAuthSuccess = (result: AuthSuccessResult) => {
    setUser(result.user);
    if (result.welcomeEmail) {
      setWelcomeToast({ email: result.welcomeEmail, visible: true });
    }
    fetchNotifications();
  };

  const handleDownload = async (file: FileItem) => {
    try {
      await api.downloadFile(file._id, file.name);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await api.deleteFile(fileId, false); // soft-delete
      refreshContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await api.deleteFolder(folderId, false); // soft-delete
      refreshContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleRenameFolder = async (folder: FolderItem) => {
    const newName = prompt("Enter new folder name:", folder.name);
    if (!newName || newName === folder.name) return;
    try {
      await api.renameFolder(folder._id, newName);
      refreshContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const handleSelectEmail = async (item: SecurityNotificationItem) => {
    setActiveEmailToView(item);
    if (!item.isRead) {
      try {
        await api.markNotificationRead(item._id);
        fetchNotifications();
      } catch {
        // Ignore
      }
    }
  };

  if (checkingAuth) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Initializing Skybox Drive...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <AuthModal onSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setCurrentFolderId(null);
        }}
        onOpenNewFolder={() => setShowNewFolderModal(true)}
        onOpenUpload={() => setShowUploadModal(true)}
        storageStats={storageStats}
      />

      {/* Main Workspace */}
      <div className="main-content">
        <Navbar
          user={user}
          searchQuery={searchQuery}
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setShowNotificationsModal(true)}
          onSearchChange={setSearchQuery}
          onLogout={handleLogout}
        />

        <main className="content-body">
          {currentTab === "my-drive" && (
            <>
              {folderData && (
                <Breadcrumbs
                  breadcrumbs={folderData.breadcrumbs}
                  onNavigate={(fId) => setCurrentFolderId(fId)}
                />
              )}

              {folderData && (
                <>
                  <FolderGrid
                    folders={folderData.folders}
                    onOpenFolder={(fId) => setCurrentFolderId(fId)}
                    onShare={(folder) => setShareTarget({ item: folder, type: "folder" })}
                    onRename={handleRenameFolder}
                    onDelete={handleDeleteFolder}
                  />

                  <FileList
                    files={folderData.files}
                    onDownload={handleDownload}
                    onOpenVersions={(file) => setVersionTarget(file)}
                    onShare={(file) => setShareTarget({ item: file, type: "file" })}
                    onDelete={handleDeleteFile}
                  />
                </>
              )}
            </>
          )}

          {currentTab === "shared-with-me" && (
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
                Shared with me
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
                Files and folders directly shared with your account.
              </p>

              {sharedData.folders.length > 0 && (
                <FolderGrid
                  folders={sharedData.folders}
                  onOpenFolder={(fId) => {
                    setCurrentTab("my-drive");
                    setCurrentFolderId(fId);
                  }}
                  onShare={(folder) => setShareTarget({ item: folder, type: "folder" })}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                />
              )}

              <FileList
                files={sharedData.files}
                onDownload={handleDownload}
                onOpenVersions={(file) => setVersionTarget(file)}
                onShare={(file) => setShareTarget({ item: file, type: "file" })}
                onDelete={handleDeleteFile}
              />
            </div>
          )}

          {currentTab === "trash" && (
            <TrashView
              folders={trashData.folders}
              files={trashData.files}
              onRefresh={refreshContent}
            />
          )}
        </main>
      </div>

      {/* Floating Security Alert / Welcome Email Toast */}
      {welcomeToast && welcomeToast.visible && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#141e33",
            border: "1px solid rgba(59, 130, 246, 0.4)",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            zIndex: 9990,
            maxWidth: "440px",
            animation: "slideIn 0.3s ease-out"
          }}
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              backgroundColor: "rgba(59, 130, 246, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <Mail size={20} color="var(--accent-blue)" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#ffffff", margin: 0 }}>
              Security Alert Email Sent!
            </h4>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px", margin: 0 }}>
              Delivered to: <span style={{ color: "#93c5fd" }}>{welcomeToast.email.to}</span>
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, flexShrink: 0 }}
            onClick={() => {
              setActiveEmailToView(welcomeToast.email);
              setWelcomeToast(null);
            }}
          >
            Read Email
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "2px",
              flexShrink: 0
            }}
            onClick={() => setWelcomeToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Full HTML Email Viewer Modal */}
      {activeEmailToView && (
        <EmailViewerModal
          email={activeEmailToView}
          onClose={() => setActiveEmailToView(null)}
        />
      )}

      {/* Security Notifications & Alert History Modal */}
      {showNotificationsModal && (
        <NotificationModal
          isOpen={showNotificationsModal}
          notifications={notifications}
          onClose={() => setShowNotificationsModal(false)}
          onSelectEmail={handleSelectEmail}
        />
      )}

      {/* Modals & Overlays */}
      {showUploadModal && (
        <UploadModal
          currentFolderId={currentFolderId}
          onClose={() => setShowUploadModal(false)}
          onRefresh={refreshContent}
        />
      )}

      {showNewFolderModal && (
        <NewFolderModal
          currentFolderId={currentFolderId}
          onClose={() => setShowNewFolderModal(false)}
          onRefresh={refreshContent}
        />
      )}

      {shareTarget && (
        <ShareModal
          item={shareTarget.item}
          type={shareTarget.type}
          onClose={() => setShareTarget(null)}
          onRefresh={refreshContent}
        />
      )}

      {versionTarget && (
        <VersionDrawer
          file={versionTarget}
          onClose={() => setVersionTarget(null)}
          onRefresh={refreshContent}
        />
      )}
    </div>
  );
};
