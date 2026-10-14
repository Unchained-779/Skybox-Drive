import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middlewares/auth.middleware";
import { FileService } from "../services/file.service";
import { BadRequestError } from "../utils/errors";

export const renameFileSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    newName: z.string().min(1, "New file name is required").max(255)
  })
});

export const moveFileSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    targetFolderId: z.string().nullable()
  })
});

export class FileController {
  public static async upload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      if (!req.file) {
        throw new BadRequestError("No file uploaded. Please attach a file to form field 'file'.");
      }

      const folderId = (req.body.folderId as string) || null;

      const file = await FileService.uploadFile(
        {
          tempFilePath: req.file.path,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          folderId,
          ownerId: req.user._id
        },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: "File uploaded successfully",
        data: file
      });
    } catch (error) {
      next(error);
    }
  }

  public static async download(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const versionNumber = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
      const rangeHeader = req.headers.range;

      const downloadData = await FileService.getDownloadStream({
        fileId: req.params.id,
        userId: req.user._id,
        versionNumber,
        rangeHeader,
        ipAddress: req.ip
      });

      res.setHeader("Content-Type", downloadData.mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(downloadData.filename)}"`
      );

      if (downloadData.range) {
        res.status(downloadData.statusCode);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader(
          "Content-Range",
          `bytes ${downloadData.range.start}-${downloadData.range.end}/${downloadData.size}`
        );
        res.setHeader("Content-Length", downloadData.range.end - downloadData.range.start + 1);
      } else {
        res.status(200);
        res.setHeader("Content-Length", downloadData.size);
      }

      downloadData.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  public static async rename(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const file = await FileService.renameFile({
        fileId: req.params.id,
        newName: req.body.newName,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: "File renamed successfully",
        data: file
      });
    } catch (error) {
      next(error);
    }
  }

  public static async move(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const file = await FileService.moveFile({
        fileId: req.params.id,
        targetFolderId: req.body.targetFolderId,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: "File moved successfully",
        data: file
      });
    } catch (error) {
      next(error);
    }
  }

  public static async uploadVersion(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      if (!req.file) {
        throw new BadRequestError("No replacement file attached.");
      }

      const file = await FileService.uploadNewVersion({
        fileId: req.params.id,
        tempFilePath: req.file.path,
        size: req.file.size,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(201).json({
        success: true,
        message: `Version ${file.currentVersion} uploaded successfully`,
        data: file
      });
    } catch (error) {
      next(error);
    }
  }

  public static async restoreVersion(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const versionNumber = parseInt(req.params.version, 10);
      if (isNaN(versionNumber)) {
        throw new BadRequestError("Invalid version number parameter.");
      }

      const file = await FileService.restoreVersion({
        fileId: req.params.id,
        versionNumber,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: `Version ${versionNumber} restored as head version`,
        data: file
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const permanent = req.query.permanent === "true";
      const result = await FileService.deleteFile({
        fileId: req.params.id,
        userId: req.user._id,
        permanent,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: permanent ? "File permanently deleted" : "File moved to trash",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
