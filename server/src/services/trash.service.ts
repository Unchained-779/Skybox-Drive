import { Types } from "mongoose";
import { File } from "../models/File.model";
import { Folder } from "../models/Folder.model";
import { AuditLog } from "../models/AuditLog.model";
import { storageService } from "./storage/LocalStorageProvider";
import { QuotaService } from "./quota.service";
import { NotFoundError, ForbiddenError } from "../utils/errors";

export class TrashService {
  public static async listTrash(userId: Types.ObjectId) {
    const [folders, files] = await Promise.all([
      Folder.find({ ownerId: userId, isTrash: true }).sort({ trashedAt: -1 }).lean(),
      File.find({ ownerId: userId, isTrash: true }).sort({ trashedAt: -1 }).lean()
    ]);

    return { folders, files };
  }

  public static async restoreResource(params: {
    resourceType: "file" | "folder";
    resourceId: string;
    userId: Types.ObjectId;
    ipAddress?: string;
  }) {
    const resId = new Types.ObjectId(params.resourceId);

    if (params.resourceType === "file") {
      const file = await File.findOne({ _id: resId, isTrash: true });
      if (!file) throw new NotFoundError("File not found in trash.");

      if (!file.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the file owner can restore this item.");
      }

      // Check if parent folder exists and is not in trash
      let targetFolderId = file.folderId;
      if (targetFolderId) {
        const parentFolder = await Folder.findOne({ _id: targetFolderId, isTrash: false });
        if (!parentFolder) {
          // Fallback to root directory if original parent was deleted or in trash
          targetFolderId = null;
        }
      }

      file.folderId = targetFolderId;
      file.isTrash = false;
      file.trashedAt = null;
      await file.save();

      await AuditLog.create({
        userId: params.userId,
        action: "RESTORE_FILE",
        resourceType: "file",
        resourceId: file._id,
        ipAddress: params.ipAddress
      });

      return file;
    } else {
      const folder = await Folder.findOne({ _id: resId, isTrash: true });
      if (!folder) throw new NotFoundError("Folder not found in trash.");

      if (!folder.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the folder owner can restore this item.");
      }

      let targetParentId = folder.parentId;
      let newAncestors: Types.ObjectId[] = [];

      if (targetParentId) {
        const parentFolder = await Folder.findOne({ _id: targetParentId, isTrash: false });
        if (!parentFolder) {
          // Fallback to root directory if original parent is in trash
          targetParentId = null;
          newAncestors = [];
        } else {
          newAncestors = [...parentFolder.ancestors, parentFolder._id as Types.ObjectId];
        }
      }

      folder.parentId = targetParentId;
      folder.ancestors = newAncestors;
      folder.isTrash = false;
      folder.trashedAt = null;
      await folder.save();

      // Restore all descendant folders and files
      await Folder.updateMany(
        { ancestors: folder._id, isTrash: true },
        { $set: { isTrash: false, trashedAt: null } }
      );
      await File.updateMany(
        { folderId: folder._id, isTrash: true },
        { $set: { isTrash: false, trashedAt: null } }
      );

      await AuditLog.create({
        userId: params.userId,
        action: "RESTORE_FOLDER",
        resourceType: "folder",
        resourceId: folder._id,
        ipAddress: params.ipAddress
      });

      return folder;
    }
  }

  public static async emptyTrash(userId: Types.ObjectId, ipAddress?: string) {
    const trashedFiles = await File.find({ ownerId: userId, isTrash: true });
    let totalBytesFreed = 0;

    for (const file of trashedFiles) {
      await storageService.deleteFile(file.storageKey);
      totalBytesFreed += file.size;

      for (const ver of file.versions) {
        await storageService.deleteFile(ver.storageKey);
        totalBytesFreed += ver.size;
      }
    }

    // Release total quota
    await QuotaService.releaseQuota(userId, totalBytesFreed);

    // Delete all records from MongoDB
    await File.deleteMany({ ownerId: userId, isTrash: true });
    await Folder.deleteMany({ ownerId: userId, isTrash: true });

    await AuditLog.create({
      userId,
      action: "EMPTY_TRASH",
      resourceType: "auth",
      details: { freedBytes: totalBytesFreed, fileCount: trashedFiles.length },
      ipAddress
    });

    return { cleared: true, freedBytes: totalBytesFreed };
  }
}
