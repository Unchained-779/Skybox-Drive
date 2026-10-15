import crypto from "crypto";
import { Types } from "mongoose";
import { File } from "../models/File.model";
import { Folder } from "../models/Folder.model";
import { User } from "../models/User.model";
import { ShareLink, IShareLink } from "../models/ShareLink.model";
import { AuditLog } from "../models/AuditLog.model";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError
} from "../utils/errors";
import { MailService } from "./mail.service";
import { storageService } from "./storage/LocalStorageProvider";
import { ByteRange } from "../interfaces/IStorageProvider";

export interface ShareResourceDTO {
  resourceType: "file" | "folder";
  resourceId: string;
  targetEmail: string;
  role: "viewer" | "editor";
  userId: Types.ObjectId;
}

export class ShareService {
  public static async shareResource(dto: ShareResourceDTO, ipAddress?: string) {
    const targetUser = await User.findOne({ email: dto.targetEmail.toLowerCase() });
    if (!targetUser) {
      throw new NotFoundError(`User with email "${dto.targetEmail}" does not exist on Skybox Drive.`);
    }

    if (targetUser._id.equals(dto.userId)) {
      throw new BadRequestError("You cannot share a resource with yourself.");
    }

    const resId = new Types.ObjectId(dto.resourceId);

    if (dto.resourceType === "file") {
      const file = await File.findOne({ _id: resId, isTrash: false });
      if (!file) throw new NotFoundError("File not found.");

      if (!file.ownerId.equals(dto.userId)) {
        throw new ForbiddenError("Only the file owner can grant or modify sharing permissions.");
      }

      const existingIndex = file.sharedWith.findIndex((s) => s.userId.equals(targetUser._id));
      if (existingIndex !== -1) {
        file.sharedWith[existingIndex].role = dto.role;
      } else {
        file.sharedWith.push({ userId: targetUser._id, role: dto.role });
      }

      await file.save();

      await AuditLog.create({
        userId: dto.userId,
        action: "SHARE_FILE",
        resourceType: "file",
        resourceId: file._id,
        details: { sharedWith: targetUser.email, role: dto.role },
        ipAddress
      });

      return file;
    } else {
      const folder = await Folder.findOne({ _id: resId, isTrash: false });
      if (!folder) throw new NotFoundError("Folder not found.");

      if (!folder.ownerId.equals(dto.userId)) {
        throw new ForbiddenError("Only the folder owner can grant or modify sharing permissions.");
      }

      const existingIndex = folder.sharedWith.findIndex((s) => s.userId.equals(targetUser._id));
      if (existingIndex !== -1) {
        folder.sharedWith[existingIndex].role = dto.role;
      } else {
        folder.sharedWith.push({ userId: targetUser._id, role: dto.role });
      }

      await folder.save();

      await AuditLog.create({
        userId: dto.userId,
        action: "SHARE_FOLDER",
        resourceType: "folder",
        resourceId: folder._id,
        details: { sharedWith: targetUser.email, role: dto.role },
        ipAddress
      });

      return folder;
    }
  }

  public static async revokeShare(params: {
    resourceType: "file" | "folder";
    resourceId: string;
    targetUserId: string;
    userId: Types.ObjectId;
    ipAddress?: string;
  }) {
    const resId = new Types.ObjectId(params.resourceId);
    const targetObjectId = new Types.ObjectId(params.targetUserId);

    if (params.resourceType === "file") {
      const file = await File.findOne({ _id: resId, isTrash: false });
      if (!file) throw new NotFoundError("File not found.");

      if (!file.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the owner can revoke sharing permissions.");
      }

      file.sharedWith = file.sharedWith.filter((s) => !s.userId.equals(targetObjectId));
      await file.save();

      await AuditLog.create({
        userId: params.userId,
        action: "REVOKE_FILE_SHARE",
        resourceType: "file",
        resourceId: file._id,
        details: { revokedUser: params.targetUserId },
        ipAddress: params.ipAddress
      });

      return file;
    } else {
      const folder = await Folder.findOne({ _id: resId, isTrash: false });
      if (!folder) throw new NotFoundError("Folder not found.");

      if (!folder.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the owner can revoke sharing permissions.");
      }

      folder.sharedWith = folder.sharedWith.filter((s) => !s.userId.equals(targetObjectId));
      await folder.save();

      await AuditLog.create({
        userId: params.userId,
        action: "REVOKE_FOLDER_SHARE",
        resourceType: "folder",
        resourceId: folder._id,
        details: { revokedUser: params.targetUserId },
        ipAddress: params.ipAddress
      });

      return folder;
    }
  }

  public static async createShareLink(params: {
    resourceType: "file" | "folder";
    resourceId: string;
    role: "viewer" | "editor";
    expiresInHours?: number;
    userId: Types.ObjectId;
  }): Promise<IShareLink> {
    const resId = new Types.ObjectId(params.resourceId);

    if (params.resourceType === "file") {
      const file = await File.findOne({ _id: resId, isTrash: false });
      if (!file) throw new NotFoundError("File not found.");
      if (!file.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the owner can generate public share links.");
      }
    } else {
      const folder = await Folder.findOne({ _id: resId, isTrash: false });
      if (!folder) throw new NotFoundError("Folder not found.");
      if (!folder.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the owner can generate public share links.");
      }
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 3600 * 1000)
      : null;

    return await ShareLink.create({
      resourceType: params.resourceType,
      resourceId: resId,
      token,
      role: params.role || "viewer",
      createdBy: params.userId,
      expiresAt
    });
  }

  public static async resolveShareLink(token: string) {
    const link = await ShareLink.findOne({ token });
    if (!link) throw new NotFoundError("Share link does not exist or has been removed.");

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new ForbiddenError("This share link has expired.");
    }

    link.accessCount += 1;
    await link.save();

    if (link.resourceType === "file") {
      const file = await File.findOne({ _id: link.resourceId, isTrash: false }).populate(
        "ownerId",
        "name email"
      );
      if (!file) throw new NotFoundError("Shared file no longer exists.");
      return { link, resource: file };
    } else {
      const folder = await Folder.findOne({ _id: link.resourceId, isTrash: false }).populate(
        "ownerId",
        "name email"
      );
      if (!folder) throw new NotFoundError("Shared folder no longer exists.");
      return { link, resource: folder };
    }
  }

  public static async listSharedWithUser(userId: Types.ObjectId) {
    const [folders, files] = await Promise.all([
      Folder.find({
        "sharedWith.userId": userId,
        isTrash: false
      })
        .populate("ownerId", "name email")
        .sort({ updatedAt: -1 }),
      File.find({
        "sharedWith.userId": userId,
        isTrash: false
      })
        .populate("ownerId", "name email")
        .sort({ updatedAt: -1 })
    ]);

    return { folders, files };
  }

  public static async inviteByEmail(params: {
    resourceType: "file" | "folder";
    resourceId: string;
    recipientEmail: string;
    role: "viewer" | "editor";
    userId: Types.ObjectId;
    origin?: string;
  }) {
    const targetEmail = params.recipientEmail.trim().toLowerCase();
    const existingUser = await User.findOne({ email: targetEmail });

    const inviter = await User.findById(params.userId);
    if (!inviter) throw new NotFoundError("Inviter not found.");

    let resourceName = "Document";
    if (params.resourceType === "file") {
      const file = await File.findOne({ _id: new Types.ObjectId(params.resourceId), isTrash: false });
      if (!file) throw new NotFoundError("File not found.");
      if (!file.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the owner can share this file.");
      }
      resourceName = file.name;
    } else {
      const folder = await Folder.findOne({ _id: new Types.ObjectId(params.resourceId), isTrash: false });
      if (!folder) throw new NotFoundError("Folder not found.");
      if (!folder.ownerId.equals(params.userId)) {
        throw new ForbiddenError("Only the owner can share this folder.");
      }
      resourceName = folder.name;
    }

    // If recipient is already registered in Skybox Drive, link permission directly in DB
    if (existingUser) {
      try {
        await this.shareResource({
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          targetEmail,
          role: params.role,
          userId: params.userId
        });
      } catch {
        // Continue to send email invite even if direct link already exists
      }
    }

    // Generate public share link
    const link = await this.createShareLink({
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      role: params.role,
      userId: params.userId
    });

    const baseOrigin = params.origin || "https://skybox-drive.onrender.com";
    const shareUrl = `${baseOrigin}/share/${link.token}`;

    const notification = await MailService.sendShareInvitationEmail({
      userId: existingUser ? (existingUser._id as Types.ObjectId) : undefined,
      to: targetEmail,
      inviterName: inviter.name,
      inviterEmail: inviter.email,
      resourceName,
      resourceType: params.resourceType,
      role: params.role,
      shareUrl
    });

    return {
      success: true,
      isExistingUser: !!existingUser,
      shareUrl,
      token: link.token,
      notification
    };
  }

  public static async getSharedFileDownloadStream(params: {
    token: string;
    rangeHeader?: string;
    ipAddress?: string;
  }) {
    const link = await ShareLink.findOne({ token: params.token });
    if (!link) throw new NotFoundError("Share link does not exist or has expired.");

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new ForbiddenError("This share link has expired.");
    }

    if (link.resourceType !== "file") {
      throw new BadRequestError("Direct stream download is only supported for files.");
    }

    const file = await File.findOne({ _id: link.resourceId, isTrash: false });
    if (!file) throw new NotFoundError("The requested file no longer exists.");

    const size = file.size;
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

    const stream = await storageService.getFileStream(file.storageKey, range);

    link.accessCount += 1;
    await link.save();

    await AuditLog.create({
      userId: file.ownerId,
      action: "DOWNLOAD_SHARED_FILE",
      resourceType: "file",
      resourceId: file._id,
      details: { token: params.token },
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
}
