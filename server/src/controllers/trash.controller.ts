import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middlewares/auth.middleware";
import { TrashService } from "../services/trash.service";

export const restoreSchema = z.object({
  body: z.object({
    resourceType: z.enum(["file", "folder"]),
    resourceId: z.string()
  })
});

export class TrashController {
  public static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const items = await TrashService.listTrash(req.user._id);

      res.status(200).json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  }

  public static async restore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const restored = await TrashService.restoreResource({
        resourceType: req.body.resourceType,
        resourceId: req.body.resourceId,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: "Resource restored successfully",
        data: restored
      });
    } catch (error) {
      next(error);
    }
  }

  public static async empty(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await TrashService.emptyTrash(req.user._id, req.ip);

      res.status(200).json({
        success: true,
        message: "Trash emptied successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
