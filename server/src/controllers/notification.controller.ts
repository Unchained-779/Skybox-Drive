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

      const userEmail = req.user.email.toLowerCase();

      const notifications = await SecurityNotification.find({
        to: userEmail
      })
        .sort({ createdAt: -1 })
        .limit(20);

      const unreadCount = await SecurityNotification.countDocuments({
        to: userEmail,
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
      const userEmail = req.user.email.toLowerCase();
      const notification = await SecurityNotification.findOneAndUpdate(
        { _id: id, to: userEmail },
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
