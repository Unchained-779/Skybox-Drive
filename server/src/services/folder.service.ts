import { Types } from "mongoose";
import { Folder, IFolder } from "../models/Folder.model";
import { File } from "../models/File.model";
import { AuditLog } from "../models/AuditLog.model";
import { storageService } from "./storage/LocalStorageProvider";
import { QuotaService } from "./quota.service";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError
} from "../utils/errors";

export interface CreateFolderDTO {
  name: string;
  parentId?: string | null;
  ownerId: Types.ObjectId;
}

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export class FolderService {
  /**
   * Helper to check user access to a folder.
   * Returns: 'owner' | 'editor' | 'viewer' | null
   */
  public static async resolveFolderAccess(
    folderId: Types.ObjectId | string,
    userId: Types.ObjectId | string
  ): Promise<"owner" | "editor" | "viewer" | null> {
    const folder = await Folder.findById(folderId);
    if (!folder) return null;

    const uIdStr = userId.toString();
    if (folder.ownerId.toString() === uIdStr) {
      return "owner";
    }

    // Check direct share
    const directShare = folder.sharedWith.find((s) => s.userId.toString() === uIdStr);
    if (directShare) {
      return directShare.role;
    }

    // Check ancestor shares (inherited permissions)
    if (folder.ancestors && folder.ancestors.length > 0) {
      const ancestorFolders = await Folder.find({ _id: { $in: folder.ancestors } });
      for (const anc of ancestorFolders) {
        if (anc.ownerId.toString() === uIdStr) return "owner";
        const share = anc.sharedWith.find((s) => s.userId.toString() === uIdStr);
        if (share) return share.role;
      }
    }

    return null;
  }

  public static async createFolder(dto: CreateFolderDTO, ipAddress?: string): Promise<IFolder> {
    const parentId = dto.parentId ? new Types.ObjectId(dto.parentId) : null;
    let ancestors: Types.ObjectId[] = [];

    if (parentId) {
      const parent = await Folder.findOne({ _id: parentId, isTrash: false });
      if (!parent) {
        throw new NotFoundError("Parent folder does not exist or is in trash.");
      }

      // Check permission on parent folder
      const access = await this.resolveFolderAccess(parentId, dto.ownerId);
      if (!access || access === "viewer") {
        throw new ForbiddenError("You do not have permission to create folders inside this directory.");
      }

      ancestors = [...parent.ancestors, parent._id as Types.ObjectId];
    }

    // Check duplicate name in same parent
    const existing = await Folder.findOne({
      ownerId: dto.ownerId,
      parentId,
      name: dto.name.trim(),
      isTrash: false
    });

    if (existing) {
      throw new ConflictError(`A folder named "${dto.name.trim()}" already exists in this directory.`);
    }

    const folder = await Folder.create({
      name: dto.name.trim(),
      parentId,
      ownerId: dto.ownerId,
      ancestors,
      isTrash: false,
      trashedAt: null,
      sharedWith: []
    });

    await AuditLog.create({
      userId: dto.ownerId,
      action: "CREATE_FOLDER",
      resourceType: "folder",
      resourceId: folder._id,
      details: { name: folder.name, parentId: folder.parentId },
      ipAddress
    });

    return folder;
  }

  public static async listFolderContents(params: {
    folderId?: string | null;
    userId: Types.ObjectId;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { folderId, userId } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    let currentFolder: IFolder | null = null;
    let breadcrumbs: Breadcrumb[] = [{ id: null, name: "My Drive" }];
    let userRole: "owner" | "editor" | "viewer" = "owner";

    const targetParentId = folderId ? new Types.ObjectId(folderId) : null;

    if (targetParentId) {
      currentFolder = await Folder.findOne({ _id: targetParentId, isTrash: false });
      if (!currentFolder) {
        throw new NotFoundError("Folder not found or has been moved to trash.");
      }

      const access = await this.resolveFolderAccess(targetParentId, userId);
      if (!access) {
        throw new ForbiddenError("You do not have permission to view this folder.");
      }
      userRole = access;

      // Construct breadcrumbs
      if (currentFolder.ancestors && currentFolder.ancestors.length > 0) {
        const ancestorsDocs = await Folder.find({ _id: { $in: currentFolder.ancestors } }).select(
          "_id name"
        );
        const map = new Map(ancestorsDocs.map((doc) => [doc._id.toString(), doc.name]));
        for (const ancId of currentFolder.ancestors) {
          const name = map.get(ancId.toString());
          if (name) {
            breadcrumbs.push({ id: ancId.toString(), name });
          }
        }
      }
      breadcrumbs.push({ id: currentFolder._id.toString(), name: currentFolder.name });
    }

    const folderQuery: Record<string, unknown> = {
      parentId: targetParentId,
      isTrash: false
    };

    const fileQuery: Record<string, unknown> = {
      folderId: targetParentId,
      isTrash: false
    };

    if (targetParentId) {
      // In a specific folder, show all items in it
    } else {
      // At root: show items owned by user OR shared directly with user at root level
      folderQuery.$or = [{ ownerId: userId }, { "sharedWith.userId": userId }];
      fileQuery.$or = [{ ownerId: userId }, { "sharedWith.userId": userId }];
    }

    if (params.search && params.search.trim()) {
      const regex = new RegExp(params.search.trim(), "i");
      folderQuery.name = regex;
      fileQuery.name = regex;
    }

    const [folders, totalFolders] = await Promise.all([
      Folder.find(folderQuery)
        .sort({ name: 1 })
        .populate("ownerId", "name email")
        .lean(),
      Folder.countDocuments(folderQuery)
    ]);

    const [files, totalFiles] = await Promise.all([
      File.find(fileQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("ownerId", "name email")
        .lean(),
      File.countDocuments(fileQuery)
    ]);

    return {
      currentFolder,
      role: userRole,
      breadcrumbs,
      folders,
      files,
      pagination: {
        page,
        limit,
        totalFiles,
        totalFolders,
        totalPages: Math.ceil(totalFiles / limit) || 1
      }
    };
  }

  public static async renameFolder(params: {
    folderId: string;
    newName: string;
    userId: Types.ObjectId;
    ipAddress?: string;
  }): Promise<IFolder> {
    const folder = await Folder.findOne({ _id: params.folderId, isTrash: false });
    if (!folder) throw new NotFoundError("Folder not found.");

    const access = await this.resolveFolderAccess(folder._id, params.userId);
    if (!access || access === "viewer") {
      throw new ForbiddenError("You do not have permission to rename this folder.");
    }

    // Check duplicate name
    const existing = await Folder.findOne({
      _id: { $ne: folder._id },
      ownerId: folder.ownerId,
      parentId: folder.parentId,
      name: params.newName.trim(),
      isTrash: false
    });
    if (existing) {
      throw new ConflictError(`A folder named "${params.newName.trim()}" already exists in this location.`);
    }

    folder.name = params.newName.trim();
    await folder.save();

    await AuditLog.create({
      userId: params.userId,
      action: "RENAME_FOLDER",
      resourceType: "folder",
      resourceId: folder._id,
      details: { newName: folder.name },
      ipAddress: params.ipAddress
    });

    return folder;
  }

  /**
   * Move folder with cycle prevention and ancestor prefix bulk updates across all descendants.
   */
  public static async moveFolder(params: {
    folderId: string;
    targetParentId: string | null;
    userId: Types.ObjectId;
    ipAddress?: string;
  }): Promise<IFolder> {
    const folder = await Folder.findOne({ _id: params.folderId, isTrash: false });
    if (!folder) throw new NotFoundError("Folder not found.");

    const folderAccess = await this.resolveFolderAccess(folder._id, params.userId);
    if (!folderAccess || folderAccess === "viewer") {
      throw new ForbiddenError("You do not have permission to move this folder.");
    }

    const newParentId = params.targetParentId ? new Types.ObjectId(params.targetParentId) : null;

    // Check if moving to the same parent
    if (
      (folder.parentId === null && newParentId === null) ||
      (folder.parentId && newParentId && folder.parentId.equals(newParentId))
    ) {
      return folder;
    }

    let newAncestors: Types.ObjectId[] = [];

    if (newParentId) {
      // 1. Cycle Prevention check: Can't move into itself
      if (folder._id.equals(newParentId)) {
        throw new BadRequestError("Cannot move a folder into itself.");
      }

      const targetParent = await Folder.findOne({ _id: newParentId, isTrash: false });
      if (!targetParent) {
        throw new NotFoundError("Target destination folder does not exist.");
      }

      // 2. Cycle Prevention check: Target parent cannot be a descendant of folder
      const targetAncestorsStr = targetParent.ancestors.map((id) => id.toString());
      if (targetAncestorsStr.includes(folder._id.toString())) {
        throw new BadRequestError("Cannot move a folder into one of its own subfolders (circular loop detected).");
      }

      const targetAccess = await this.resolveFolderAccess(targetParent._id, params.userId);
      if (!targetAccess || targetAccess === "viewer") {
        throw new ForbiddenError("You do not have permission to write to the destination folder.");
      }

      newAncestors = [...targetParent.ancestors, targetParent._id as Types.ObjectId];
    }

    // Check duplicate name in destination
    const existing = await Folder.findOne({
      _id: { $ne: folder._id },
      ownerId: folder.ownerId,
      parentId: newParentId,
      name: folder.name,
      isTrash: false
    });
    if (existing) {
      throw new ConflictError(`A folder named "${folder.name}" already exists in the destination folder.`);
    }

    // Update folder itself
    folder.parentId = newParentId;
    folder.ancestors = newAncestors;
    await folder.save();

    // Bulk update descendants' ancestors arrays
    // For every descendant: newAncestorsOfDescendant = [...newAncestors, folder._id, ...descendantAncestorsAfterFolder]
    const descendants = await Folder.find({ ancestors: folder._id });
    for (const desc of descendants) {
      const idx = desc.ancestors.findIndex((a) => a.equals(folder._id));
      if (idx !== -1) {
        const remainingSuffix = desc.ancestors.slice(idx + 1);
        desc.ancestors = [...newAncestors, folder._id as Types.ObjectId, ...remainingSuffix];
        await desc.save();
      }
    }

    await AuditLog.create({
      userId: params.userId,
      action: "MOVE_FOLDER",
      resourceType: "folder",
      resourceId: folder._id,
      details: { newParentId },
      ipAddress: params.ipAddress
    });

    return folder;
  }

  /**
   * Soft-delete folder or permanent delete.
   */
  public static async deleteFolder(params: {
    folderId: string;
    userId: Types.ObjectId;
    permanent?: boolean;
    ipAddress?: string;
  }): Promise<{ deleted: boolean }> {
    const folder = await Folder.findById(params.folderId);
    if (!folder) throw new NotFoundError("Folder not found.");

    if (folder.ownerId.toString() !== params.userId.toString()) {
      throw new ForbiddenError("Only the folder owner can delete this folder.");
    }

    // Find all descendant folders
    const descendantFolders = await Folder.find({ ancestors: folder._id });
    const allFolderIds = [folder._id, ...descendantFolders.map((f) => f._id)];

    if (!params.permanent) {
      // Soft Delete: Move folder and all descendants + files to trash
      const now = new Date();
      await Folder.updateMany(
        { _id: { $in: allFolderIds } },
        { $set: { isTrash: true, trashedAt: now } }
      );
      await File.updateMany(
        { folderId: { $in: allFolderIds } },
        { $set: { isTrash: true, trashedAt: now } }
      );

      await AuditLog.create({
        userId: params.userId,
        action: "TRASH_FOLDER",
        resourceType: "folder",
        resourceId: folder._id,
        ipAddress: params.ipAddress
      });

      return { deleted: true };
    }

    // Permanent Delete:
    // 1. Find all files in these folders
    const files = await File.find({ folderId: { $in: allFolderIds } });
    let totalBytesToFree = 0;

    for (const file of files) {
      // Free storage disk for current version
      await storageService.deleteFile(file.storageKey);
      totalBytesToFree += file.size;

      // Free storage disk for all previous versions
      for (const ver of file.versions) {
        await storageService.deleteFile(ver.storageKey);
        totalBytesToFree += ver.size;
      }
    }

    // Release user quota
    await QuotaService.releaseQuota(params.userId, totalBytesToFree);

    // Delete files and folders from MongoDB
    await File.deleteMany({ folderId: { $in: allFolderIds } });
    await Folder.deleteMany({ _id: { $in: allFolderIds } });

    await AuditLog.create({
      userId: params.userId,
      action: "PERMANENT_DELETE_FOLDER",
      resourceType: "folder",
      resourceId: folder._id,
      details: { freedBytes: totalBytesToFree },
      ipAddress: params.ipAddress
    });

    return { deleted: true };
  }

  public static async getAllFolders(userId: Types.ObjectId) {
    const folders = await Folder.find({
      $or: [{ ownerId: userId }, { "sharedWith.userId": userId }],
      isTrash: false
    })
      .select("_id name parentId ancestors")
      .sort({ name: 1 })
      .lean();

    return folders.map((f) => ({
      _id: f._id.toString(),
      name: f.name,
      parentId: f.parentId ? f.parentId.toString() : null,
      ancestors: (f.ancestors || []).map((a) => a.toString())
    }));
  }
}
