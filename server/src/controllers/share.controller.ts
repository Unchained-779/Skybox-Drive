import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middlewares/auth.middleware";
import { ShareService } from "../services/share.service";

export const shareResourceSchema = z.object({
  body: z.object({
    resourceType: z.enum(["file", "folder"]),
    resourceId: z.string(),
    targetEmail: z.string().email(),
    role: z.enum(["viewer", "editor"])
  })
});

export const revokeShareSchema = z.object({
  body: z.object({
    resourceType: z.enum(["file", "folder"]),
    resourceId: z.string(),
    targetUserId: z.string()
  })
});

export const createShareLinkSchema = z.object({
  body: z.object({
    resourceType: z.enum(["file", "folder"]),
    resourceId: z.string(),
    role: z.enum(["viewer", "editor"]).default("viewer"),
    expiresInHours: z.number().positive().optional()
  })
});

export class ShareController {
  public static async share(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await ShareService.shareResource(
        {
          resourceType: req.body.resourceType,
          resourceId: req.body.resourceId,
          targetEmail: req.body.targetEmail,
          role: req.body.role,
          userId: req.user._id
        },
        req.ip
      );

      res.status(200).json({
        success: true,
        message: `Resource shared with ${req.body.targetEmail} as ${req.body.role}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async revoke(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await ShareService.revokeShare({
        resourceType: req.body.resourceType,
        resourceId: req.body.resourceId,
        targetUserId: req.body.targetUserId,
        userId: req.user._id,
        ipAddress: req.ip
      });

      res.status(200).json({
        success: true,
        message: "Sharing permissions revoked",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createLink(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const link = await ShareService.createShareLink({
        resourceType: req.body.resourceType,
        resourceId: req.body.resourceId,
        role: req.body.role,
        expiresInHours: req.body.expiresInHours,
        userId: req.user._id
      });

      res.status(201).json({
        success: true,
        message: "Public share link generated",
        data: link
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resolveLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const result = await ShareService.resolveShareLink(token);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listShared(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const result = await ShareService.listSharedWithUser(req.user._id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
