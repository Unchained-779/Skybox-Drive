export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  authProvider?: "local" | "google";
  storageQuota: number;
  usedStorage: number;
}

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export interface FolderItem {
  _id: string;
  name: string;
  parentId: string | null;
  ownerId: { _id: string; name: string; email: string };
  ancestors: string[];
  isTrash: boolean;
  sharedWith: { userId: string; role: "viewer" | "editor" }[];
  createdAt: string;
  updatedAt: string;
}

export interface FileVersion {
  versionNumber: number;
  storageKey: string;
  size: number;
  checksum: string;
  uploadedBy: string;
  createdAt: string;
}

export interface FileItem {
  _id: string;
  name: string;
  folderId: string | null;
  ownerId: { _id: string; name: string; email: string };
  size: number;
  mimeType: string;
  storageKey: string;
  checksum: string;
  currentVersion: number;
  versions: FileVersion[];
  isTrash: boolean;
  sharedWith: { userId: string; role: "viewer" | "editor" }[];
  createdAt: string;
  updatedAt: string;
}

export interface StorageCategoryStat {
  bytes: number;
  count: number;
}

export interface StorageStats {
  storageQuota: number;
  usedStorage: number;
  remainingStorage: number;
  percentageUsed: number;
  breakdown: {
    documents: StorageCategoryStat;
    images: StorageCategoryStat;
    videos: StorageCategoryStat;
    audio: StorageCategoryStat;
    others: StorageCategoryStat;
  };
}

export interface FolderContentsResponse {
  currentFolder: FolderItem | null;
  role: "owner" | "editor" | "viewer";
  breadcrumbs: Breadcrumb[];
  folders: FolderItem[];
  files: FileItem[];
  pagination: {
    page: number;
    limit: number;
    totalFiles: number;
    totalFolders: number;
    totalPages: number;
  };
}
