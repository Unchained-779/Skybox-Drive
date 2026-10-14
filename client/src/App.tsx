import React, { useState, useEffect, useCallback } from "react";
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
import { api, getAuthToken, removeAuthToken } from "./api";
import {
  User,
  StorageStats,
  FolderContentsResponse,
  FolderItem,
  FileItem
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

  // Modal / Drawer State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ item: FolderItem | FileItem; type: "file" | "folder" } | null>(null);
  const [versionTarget, setVersionTarget] = useState<FileItem | null>(null);

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
      } catch {
        removeAuthToken();
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };
    initAuth();
  }, []);

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
    } catch (err: unknown) {
      console.error("Failed to load drive content:", err);
    }
  }, [user, currentTab, currentFolderId, searchQuery, refreshStorageStats]);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
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
      alert(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await api.deleteFolder(folderId, false); // soft-delete
      refreshContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  const handleRenameFolder = async (folder: FolderItem) => {
    const newName = window.prompt("Enter new folder name:", folder.name);
    if (!newName || newName.trim() === folder.name) return;
    try {
      await api.renameFolder(folder._id, newName.trim());
      refreshContent();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Rename failed");
    }
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-secondary)"
        }}
      >
        Loading Skybox Drive...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
        <AuthModal
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            refreshContent();
          }}
        />
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
