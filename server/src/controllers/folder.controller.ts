import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middlewares/auth.middleware";
import { FolderService } from "../services/folder.service";

export const createFolderSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Folder name is required").max(255),
    parentId: z.string().nullable().optional()
  })
});

export const renameFolderSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    newName: z.string().min(1, "New folder name is required").max(255)
  })
});

export const moveFolderSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    targetParentId: z.string().nullable()
  })
});

export class FolderController {
  public static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const folder = await FolderService.createFolder(
        {
          name: req.body.name,
          parentId: req.body.parentId || null,
          ownerId: req.user._id
        },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: "Folder created successfully",
        data: folder
      });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const folderId = (req.query.folderId as string) || null;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const search = (req.query.search as string) || undefined;

      const contents = await FolderService.listFolderContents({
        folderId,
        userId: req.user._id,
        page,
        limit,
        search
      });

      res.status(200).json({
        success: true,
        data: contents
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const folders = await FolderService.getAllFolders(req.user._id);
      res.status(200).json({
        success: true,
        data: folders
      });
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

      const folder = await FolderService.renameFolder({
        folderId: req.params.id,
        newName: req.body.newName,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: "Folder renamed successfully",
        data: folder
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

      const folder = await FolderService.moveFolder({
        folderId: req.params.id,
        targetParentId: req.body.targetParentId,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: "Folder moved successfully",
        data: folder
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
      const result = await FolderService.deleteFolder({
        folderId: req.params.id,
        userId: req.user._id,
        permanent,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: permanent ? "Folder permanently deleted" : "Folder moved to trash",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
