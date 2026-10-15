import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { SecurityNotification } from "../models/SecurityNotification.model";

export class NotificationController {
  public static async getUserNotifications(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const notifications = await SecurityNotification.find({
        userId: req.user._id
      })
        .sort({ createdAt: -1 })
        .limit(20);

      const unreadCount = await SecurityNotification.countDocuments({
        userId: req.user._id,
        isRead: false
      });

      res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public static async markAsRead(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { id } = req.params;
      const notification = await SecurityNotification.findOneAndUpdate(
        { _id: id, userId: req.user._id },
        { isRead: true },
        { new: true }
      );

      res.status(200).json({
        success: true,
        data: notification
      });
    } catch (error) {
      next(error);
    }
  }
}
