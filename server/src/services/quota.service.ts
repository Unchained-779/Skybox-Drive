import { Types } from "mongoose";
import { User, IUser } from "../models/User.model";
import { File } from "../models/File.model";
import { QuotaExceededError } from "../utils/errors";

export interface CategoryStat {
  bytes: number;
  count: number;
}

export interface StorageStatsResponse {
  storageQuota: number;
  usedStorage: number;
  remainingStorage: number;
  percentageUsed: number;
  breakdown: {
    documents: CategoryStat;
    images: CategoryStat;
    videos: CategoryStat;
    audio: CategoryStat;
    others: CategoryStat;
  };
}

export class QuotaService {
  /**
   * Atomically reserve storage space in MongoDB before or during file ingestion.
   * Throws QuotaExceededError if the increment would exceed the user's storageQuota.
   */
  public static async reserveQuota(userId: Types.ObjectId | string, sizeInBytes: number): Promise<IUser> {
    if (sizeInBytes <= 0) {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");
      return user;
    }

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        $expr: {
          $lte: [{ $add: ["$usedStorage", sizeInBytes] }, "$storageQuota"]
        }
      },
      {
        $inc: { usedStorage: sizeInBytes }
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new QuotaExceededError(
        `Storage quota exceeded. Cannot upload ${Math.round(sizeInBytes / 1024)} KB.`
      );
    }

    return updatedUser;
  }

  /**
   * Rollback or release reserved storage bytes (e.g. after upload error or file deletion).
   */
  public static async releaseQuota(userId: Types.ObjectId | string, sizeInBytes: number): Promise<void> {
    if (sizeInBytes <= 0) return;

    await User.findByIdAndUpdate(userId, {
      $inc: { usedStorage: -sizeInBytes }
    });
  }

  /**
   * Aggregates storage statistics and category breakdown for the user dashboard.
   */
  public static async getStorageStats(userId: Types.ObjectId): Promise<StorageStatsResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Aggregate active files owned by the user (excluding trash)
    const files = await File.find({ ownerId: userId, isTrash: false }).select("size mimeType versions");

    const breakdown = {
      documents: { bytes: 0, count: 0 },
      images: { bytes: 0, count: 0 },
      videos: { bytes: 0, count: 0 },
      audio: { bytes: 0, count: 0 },
      others: { bytes: 0, count: 0 }
    };

    for (const file of files) {
      // Total size of this file including all its historical versions
      const versionsTotalSize = file.versions.reduce((acc, v) => acc + v.size, 0);
      const totalFileSize = file.size + versionsTotalSize;
      const count = 1;

      const mime = file.mimeType.toLowerCase();
      if (
        mime.includes("pdf") ||
        mime.includes("document") ||
        mime.includes("text") ||
        mime.includes("msword") ||
        mime.includes("officedocument") ||
        mime.includes("csv") ||
        mime.includes("json")
      ) {
        breakdown.documents.bytes += totalFileSize;
        breakdown.documents.count += count;
      } else if (mime.startsWith("image/")) {
        breakdown.images.bytes += totalFileSize;
        breakdown.images.count += count;
      } else if (mime.startsWith("video/")) {
        breakdown.videos.bytes += totalFileSize;
        breakdown.videos.count += count;
      } else if (mime.startsWith("audio/")) {
        breakdown.audio.bytes += totalFileSize;
        breakdown.audio.count += count;
      } else {
        breakdown.others.bytes += totalFileSize;
        breakdown.others.count += count;
      }
    }

    const remainingStorage = Math.max(0, user.storageQuota - user.usedStorage);
    const percentageUsed =
      user.storageQuota > 0
        ? Math.min(100, parseFloat(((user.usedStorage / user.storageQuota) * 100).toFixed(2)))
        : 0;

    return {
      storageQuota: user.storageQuota,
      usedStorage: user.usedStorage,
      remainingStorage,
      percentageUsed,
      breakdown
    };
  }
}
