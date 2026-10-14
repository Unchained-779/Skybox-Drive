import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { QuotaService } from "../services/quota.service";
import { User } from "../models/User.model";

export class UserController {
  public static async getStorageStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const stats = await QuotaService.getStorageStats(req.user._id);
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  public static async searchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const query = (req.query.q as string) || "";
      if (!query || query.trim().length < 2) {
        res.status(200).json({ success: true, data: [] });
        return;
      }

      const users = await User.find({
        _id: { $ne: req.user._id },
        $or: [
          { email: { $regex: query.trim(), $options: "i" } },
          { name: { $regex: query.trim(), $options: "i" } }
        ]
      })
        .select("_id name email")
        .limit(10);

      res.status(200).json({
        success: true,
        data: users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email
        }))
      });
    } catch (error) {
      next(error);
    }
  }
}
