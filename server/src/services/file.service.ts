import fs from "fs";
import path from "path";
import { Types } from "mongoose";
import { File, IFile, IFileVersion } from "../models/File.model";
import { AuditLog } from "../models/AuditLog.model";
import { storageService } from "./storage/LocalStorageProvider";
import { QuotaService } from "./quota.service";
import { FolderService } from "./folder.service";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError
} from "../utils/errors";
import { ByteRange } from "../interfaces/IStorageProvider";
import { Readable } from "stream";

export interface UploadFileDTO {
  tempFilePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderId?: string | null;
  ownerId: Types.ObjectId;
}

export class FileService {
  /**
   * Helper to check user access to a file.
   * Returns: 'owner' | 'editor' | 'viewer' | null
   */
  public static async resolveFileAccess(
    file: IFile,
    userId: Types.ObjectId | string
  ): Promise<"owner" | "editor" | "viewer" | null> {
    const uIdStr = userId.toString();

    // 1. Direct Owner
    if (file.ownerId.toString() === uIdStr) {
      return "owner";
    }

    // 2. Direct Share
    const directShare = file.sharedWith.find((s) => s.userId.toString() === uIdStr);
    if (directShare) {
      return directShare.role;
    }

    // 3. Inherited from parent folder
    if (file.folderId) {
      const folderAccess = await FolderService.resolveFolderAccess(file.folderId, userId);
      if (folderAccess) {
        return folderAccess;
      }
    }

    return null;
  }

  /**
   * Resolves unique filename if collision occurs in the same folder.
   */
  private static async getUniqueFilename(
    ownerId: Types.ObjectId,
    folderId: Types.ObjectId | null,
    baseName: string
  ): Promise<string> {
    const ext = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, ext);

    let candidate = baseName;
    let counter = 1;

    while (
      await File.findOne({
        ownerId,
        folderId,
        name: candidate,
        isTrash: false
      })
    ) {
      candidate = `${nameWithoutExt} (${counter})${ext}`;
      counter++;
    }

    return candidate;
  }

  public static async uploadFile(dto: UploadFileDTO, ipAddress?: string): Promise<IFile> {
    const targetFolderId = dto.folderId ? new Types.ObjectId(dto.folderId) : null;

    if (targetFolderId) {
      const folderAccess = await FolderService.resolveFolderAccess(targetFolderId, dto.ownerId);
      if (!folderAccess || folderAccess === "viewer") {
        if (fs.existsSync(dto.tempFilePath)) {
          fs.unlinkSync(dto.tempFilePath);
        }
        throw new ForbiddenError("You do not have permission to upload files to this folder.");
      }
    }

    // 1. Atomic Quota Reservation
    await QuotaService.reserveQuota(dto.ownerId, dto.size);

    let storageKey = "";
    try {
      // 2. Persist to storage engine
      const saveResult = await storageService.saveFile(dto.tempFilePath);
      storageKey = saveResult.storageKey;

      // 3. Resolve clean unique filename
      const finalName = await this.getUniqueFilename(dto.ownerId, targetFolderId, dto.originalName);

      // 4. Save metadata to MongoDB
      const file = await File.create({
        name: finalName,
        folderId: targetFolderId,
        ownerId: dto.ownerId,
        size: saveResult.size,
        mimeType: dto.mimeType || "application/octet-stream",
        storageKey: saveResult.storageKey,
        checksum: saveResult.checksum,
        isTrash: false,
        trashedAt: null,
        sharedWith: [],
        currentVersion: 1,
        versions: []
      });

      await AuditLog.create({
        userId: dto.ownerId,
        action: "UPLOAD_FILE",
        resourceType: "file",
        resourceId: file._id,
        details: { name: file.name, size: file.size, checksum: file.checksum },
        ipAddress
      });

      return file;
    } catch (error) {
      // Compensating rollback: release quota & cleanup storage file if created
      await QuotaService.releaseQuota(dto.ownerId, dto.size);
      if (storageKey) {
        await storageService.deleteFile(storageKey);
      }
      if (fs.existsSync(dto.tempFilePath)) {
        try {
          fs.unlinkSync(dto.tempFilePath);
        } catch {
          // Ignore temp cleanup error
        }
      }
      throw error;
    }
  }

  public static async getDownloadStream(params: {
    fileId: string;
    userId: Types.ObjectId;
    versionNumber?: number;
    rangeHeader?: string;
    ipAddress?: string;
  }): Promise<{
    stream: Readable;
    filename: string;
    mimeType: string;
    size: number;
    range?: ByteRange;
    statusCode: number;
  }> {
    const file = await File.findOne({ _id: params.fileId, isTrash: false });
    if (!file) throw new NotFoundError("File not found or is in trash.");

    const access = await this.resolveFileAccess(file, params.userId);
    if (!access) {
      throw new ForbiddenError("You do not have permission to access or download this file.");
    }

    let storageKey = file.storageKey;
    let size = file.size;

    // Check if requesting an older version
    if (params.versionNumber && params.versionNumber !== file.currentVersion) {
      const historical = file.versions.find((v) => v.versionNumber === params.versionNumber);
      if (!historical) {
        throw new NotFoundError(`Version ${params.versionNumber} of this file does not exist.`);
      }
      storageKey = historical.storageKey;
      size = historical.size;
    }

    // Check for HTTP 206 Range requests (e.g. video / audio seeking)
    let range: ByteRange | undefined = undefined;
    let statusCode = 200;

    if (params.rangeHeader) {
      const parts = params.rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

      if (!isNaN(start) && start < size) {
        range = {
          start,
          end: Math.min(end, size - 1)
        };
        statusCode = 206;
      }
    }

    const stream = await storageService.getFileStream(storageKey, range);

    await AuditLog.create({
      userId: params.userId,
      action: "DOWNLOAD_FILE",
      resourceType: "file",
      resourceId: file._id,
      details: { version: params.versionNumber || file.currentVersion },
      ipAddress: params.ipAddress
    });

    return {
      stream,
      filename: file.name,
      mimeType: file.mimeType,
      size,
      range,
      statusCode
    };
  }

  public static async renameFile(params: {
    fileId: string;
    newName: string;
    userId: Types.ObjectId;
    ipAddress?: string;
  }): Promise<IFile> {
    const file = await File.findOne({ _id: params.fileId, isTrash: false });
    if (!file) throw new NotFoundError("File not found.");

    const access = await this.resolveFileAccess(file, params.userId);
    if (!access || access === "viewer") {
      throw new ForbiddenError("You do not have permission to rename this file.");
    }

    file.name = params.newName.trim();
    await file.save();

    await AuditLog.create({
      userId: params.userId,
      action: "RENAME_FILE",
      resourceType: "file",
      resourceId: file._id,
      details: { newName: file.name },
      ipAddress: params.ipAddress
    });

    return file;
  }

  public static async moveFile(params: {
    fileId: string;
    targetFolderId: string | null;
    userId: Types.ObjectId;
    ipAddress?: string;
  }): Promise<IFile> {
    const file = await File.findOne({ _id: params.fileId, isTrash: false });
    if (!file) throw new NotFoundError("File not found.");

    const access = await this.resolveFileAccess(file, params.userId);
    if (!access || access === "viewer") {
      throw new ForbiddenError("You do not have permission to move this file.");
    }

    const newFolderId = params.targetFolderId ? new Types.ObjectId(params.targetFolderId) : null;

    if (newFolderId) {
      const folderAccess = await FolderService.resolveFolderAccess(newFolderId, params.userId);
      if (!folderAccess || folderAccess === "viewer") {
        throw new ForbiddenError("You do not have permission to move files into the target folder.");
      }
    }

    file.folderId = newFolderId;
    await file.save();

    await AuditLog.create({
      userId: params.userId,
      action: "MOVE_FILE",
      resourceType: "file",
      resourceId: file._id,
      details: { newFolderId },
      ipAddress: params.ipAddress
    });

    return file;
  }

  /**
   * Uploads a new version of an existing file.
   * Cumulative Quota Rule: increments user storage by new version size.
   */
  public static async uploadNewVersion(params: {
    fileId: string;
    tempFilePath: string;
    size: number;
    userId: Types.ObjectId;
    ipAddress?: string;
  }): Promise<IFile> {
    const file = await File.findOne({ _id: params.fileId, isTrash: false });
    if (!file) throw new NotFoundError("File not found.");

    const access = await this.resolveFileAccess(file, params.userId);
    if (!access || access === "viewer") {
      if (fs.existsSync(params.tempFilePath)) fs.unlinkSync(params.tempFilePath);
      throw new ForbiddenError("You do not have permission to update or upload versions for this file.");
    }

    // 1. Reserve quota for the new version
    await QuotaService.reserveQuota(file.ownerId, params.size);

    let newStorageKey = "";
    try {
      const saveResult = await storageService.saveFile(params.tempFilePath);
      newStorageKey = saveResult.storageKey;

      // 2. Archive current head version into versions array
      const previousVersion: IFileVersion = {
        versionNumber: file.currentVersion,
        storageKey: file.storageKey,
        size: file.size,
        checksum: file.checksum,
        uploadedBy: file.ownerId,
        createdAt: file.updatedAt
      };

      file.versions.push(previousVersion);

      // 3. Promote new file as head
      file.currentVersion += 1;
      file.storageKey = saveResult.storageKey;
      file.size = saveResult.size;
      file.checksum = saveResult.checksum;

      await file.save();

      await AuditLog.create({
        userId: params.userId,
        action: "UPLOAD_VERSION",
        resourceType: "file",
        resourceId: file._id,
        details: { newVersion: file.currentVersion, size: file.size },
        ipAddress: params.ipAddress
      });

      return file;
    } catch (error) {
      await QuotaService.releaseQuota(file.ownerId, params.size);
      if (newStorageKey) {
        await storageService.deleteFile(newStorageKey);
      }
      throw error;
    }
  }

  /**
   * Restores an older version as the active head version.
   */
  public static async restoreVersion(params: {
    fileId: string;
    versionNumber: number;
    userId: Types.ObjectId;
    ipAddress?: string;
  }): Promise<IFile> {
    const file = await File.findOne({ _id: params.fileId, isTrash: false });
    if (!file) throw new NotFoundError("File not found.");

    const access = await this.resolveFileAccess(file, params.userId);
    if (!access || access === "viewer") {
      throw new ForbiddenError("You do not have permission to restore versions for this file.");
    }

    if (params.versionNumber === file.currentVersion) {
      throw new BadRequestError("The requested version is already the current head version.");
    }

    const versionIndex = file.versions.findIndex((v) => v.versionNumber === params.versionNumber);
    if (versionIndex === -1) {
      throw new NotFoundError(`Version ${params.versionNumber} does not exist for this file.`);
    }

    const targetVersion = file.versions[versionIndex];

    // Archive current head into versions
    const previousHead: IFileVersion = {
      versionNumber: file.currentVersion,
      storageKey: file.storageKey,
      size: file.size,
      checksum: file.checksum,
      uploadedBy: file.ownerId,
      createdAt: file.updatedAt
    };

    // Remove target from versions and promote to head
    file.versions.splice(versionIndex, 1);
    file.versions.push(previousHead);

    file.currentVersion = targetVersion.versionNumber;
    file.storageKey = targetVersion.storageKey;
    file.size = targetVersion.size;
    file.checksum = targetVersion.checksum;

    await file.save();

    await AuditLog.create({
      userId: params.userId,
      action: "RESTORE_VERSION",
      resourceType: "file",
      resourceId: file._id,
      details: { restoredVersion: targetVersion.versionNumber },
      ipAddress: params.ipAddress
    });

    return file;
  }

  /**
   * Delete file: soft-delete or permanent purge.
   * Cumulative Quota Rule: when permanently deleting, frees head.size + sum(all versions' sizes).
   */
  public static async deleteFile(params: {
    fileId: string;
    userId: Types.ObjectId;
    permanent?: boolean;
    ipAddress?: string;
  }): Promise<{ deleted: boolean }> {
    const file = await File.findById(params.fileId);
    if (!file) throw new NotFoundError("File not found.");

    if (file.ownerId.toString() !== params.userId.toString()) {
      throw new ForbiddenError("Only the file owner can delete this file.");
    }

    if (!params.permanent) {
      file.isTrash = true;
      file.trashedAt = new Date();
      await file.save();

      await AuditLog.create({
        userId: params.userId,
        action: "TRASH_FILE",
        resourceType: "file",
        resourceId: file._id,
        ipAddress: params.ipAddress
      });

      return { deleted: true };
    }

    // Permanent delete:
    let totalBytesFreed = file.size;
    await storageService.deleteFile(file.storageKey);

    for (const ver of file.versions) {
      totalBytesFreed += ver.size;
      await storageService.deleteFile(ver.storageKey);
    }

    // Release total quota
    await QuotaService.releaseQuota(file.ownerId, totalBytesFreed);

    // Remove DB record
    await File.deleteOne({ _id: file._id });

    await AuditLog.create({
      userId: params.userId,
      action: "PERMANENT_DELETE_FILE",
      resourceType: "file",
      resourceId: file._id,
      details: { freedBytes: totalBytesFreed },
      ipAddress: params.ipAddress
    });

    return { deleted: true };
  }
}
