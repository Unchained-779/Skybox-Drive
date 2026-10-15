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

export const inviteShareSchema = z.object({
  body: z.object({
    resourceType: z.enum(["file", "folder"]),
    resourceId: z.string(),
    recipientEmail: z.string().email(),
    role: z.enum(["viewer", "editor"]).default("viewer"),
    origin: z.string().optional()
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

  public static async invite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const origin = req.headers.origin || `${req.protocol}://${req.get("host")}`;

      const result = await ShareService.inviteByEmail({
        resourceType: req.body.resourceType,
        resourceId: req.body.resourceId,
        recipientEmail: req.body.recipientEmail,
        role: req.body.role,
        userId: req.user._id,
        origin
      });

      res.status(200).json({
        success: true,
        message: `Invitation email sent to ${req.body.recipientEmail}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async downloadShared(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const rangeHeader = req.headers.range;

      const downloadData = await ShareService.getSharedFileDownloadStream({
        token,
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
}
