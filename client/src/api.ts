import {
  User,
  StorageStats,
  FolderContentsResponse,
  FolderItem,
  FileItem,
  AuthSuccessResult,
  SecurityNotificationItem
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

export const getAuthToken = (): string | null => {
  return localStorage.getItem("skybox_token");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("skybox_token", token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("skybox_token");
};

const getHeaders = (isFormData: boolean = false): HeadersInit => {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || "An unexpected error occurred");
  }
  return data.data;
};

export const api = {
  // Auth
  async login(email: string, password: string): Promise<AuthSuccessResult> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  async register(name: string, email: string, password: string): Promise<AuthSuccessResult> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    return handleResponse(res);
  },

  async loginWithGoogle(credential: string): Promise<AuthSuccessResult> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential })
    });
    return handleResponse(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Storage Stats (Polish Item #2)
  async getStorageStats(): Promise<StorageStats> {
    const res = await fetch(`${API_BASE}/users/me/storage-stats`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Folder Operations
  async listFolder(folderId?: string | null, search?: string): Promise<FolderContentsResponse> {
    const params = new URLSearchParams();
    if (folderId) params.append("folderId", folderId);
    if (search) params.append("search", search);

    const res = await fetch(`${API_BASE}/folders?${params.toString()}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createFolder(name: string, parentId?: string | null): Promise<FolderItem> {
    const res = await fetch(`${API_BASE}/folders`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, parentId: parentId || null })
    });
    return handleResponse(res);
  },

  async renameFolder(folderId: string, newName: string): Promise<FolderItem> {
    const res = await fetch(`${API_BASE}/folders/${folderId}/rename`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ newName })
    });
    return handleResponse(res);
  },

  async moveFolder(folderId: string, targetParentId: string | null): Promise<FolderItem> {
    const res = await fetch(`${API_BASE}/folders/${folderId}/move`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ targetParentId })
    });
    return handleResponse(res);
  },

  async deleteFolder(folderId: string, permanent: boolean = false): Promise<void> {
    const res = await fetch(`${API_BASE}/folders/${folderId}?permanent=${permanent}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // File Operations
  async uploadFile(file: File, folderId?: string | null): Promise<FileItem> {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) formData.append("folderId", folderId);

    const res = await fetch(`${API_BASE}/files/upload`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  getDownloadUrl(fileId: string, versionNumber?: number): string {
    const token = getAuthToken();
    const query = versionNumber ? `?version=${versionNumber}` : "";
    return `${API_BASE}/files/${fileId}/download${query}${query ? "&" : "?"}token=${token}`;
  },

  async downloadFile(fileId: string, filename: string, versionNumber?: number): Promise<void> {
    const query = versionNumber ? `?version=${versionNumber}` : "";
    const res = await fetch(`${API_BASE}/files/${fileId}/download${query}`, {
      headers: getHeaders()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Failed to download file");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async renameFile(fileId: string, newName: string): Promise<FileItem> {
    const res = await fetch(`${API_BASE}/files/${fileId}/rename`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ newName })
    });
    return handleResponse(res);
  },

  async moveFile(fileId: string, targetFolderId: string | null): Promise<FileItem> {
    const res = await fetch(`${API_BASE}/files/${fileId}/move`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ targetFolderId })
    });
    return handleResponse(res);
  },

  async uploadVersion(fileId: string, file: File): Promise<FileItem> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/files/${fileId}/versions`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  async restoreVersion(fileId: string, versionNumber: number): Promise<FileItem> {
    const res = await fetch(`${API_BASE}/files/${fileId}/versions/${versionNumber}/restore`, {
      method: "POST",
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async deleteFile(fileId: string, permanent: boolean = false): Promise<void> {
    const res = await fetch(`${API_BASE}/files/${fileId}?permanent=${permanent}`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Sharing
  async shareResource(
    resourceType: "file" | "folder",
    resourceId: string,
    targetEmail: string,
    role: "viewer" | "editor"
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/shares`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ resourceType, resourceId, targetEmail, role })
    });
    return handleResponse(res);
  },

  async revokeShare(
    resourceType: "file" | "folder",
    resourceId: string,
    targetUserId: string
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/shares`, {
      method: "DELETE",
      headers: getHeaders(),
      body: JSON.stringify({ resourceType, resourceId, targetUserId })
    });
    return handleResponse(res);
  },

  async createShareLink(
    resourceType: "file" | "folder",
    resourceId: string,
    role: "viewer" | "editor" = "viewer"
  ): Promise<{ token: string }> {
    const res = await fetch(`${API_BASE}/shares/link`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ resourceType, resourceId, role })
    });
    return handleResponse(res);
  },

  async getSharedWithMe(): Promise<{ folders: FolderItem[]; files: FileItem[] }> {
    const res = await fetch(`${API_BASE}/shares/shared-with-me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Trash
  async listTrash(): Promise<{ folders: FolderItem[]; files: FileItem[] }> {
    const res = await fetch(`${API_BASE}/trash`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async restoreTrash(resourceType: "file" | "folder", resourceId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/trash/restore`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ resourceType, resourceId })
    });
    return handleResponse(res);
  },

  async emptyTrash(): Promise<void> {
    const res = await fetch(`${API_BASE}/trash/empty`, {
      method: "DELETE",
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Security Notifications & Emails
  async getNotifications(): Promise<{ notifications: SecurityNotificationItem[]; unreadCount: number }> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string): Promise<SecurityNotificationItem> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: "PATCH",
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
