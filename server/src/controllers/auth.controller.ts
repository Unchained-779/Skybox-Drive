import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    name: z.string().min(2, "Name must be at least 2 characters long")
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required")
  })
});

export const googleAuthSchema = z.object({
  body: z.object({
    credential: z.string().min(1, "Google credential token is required")
  })
});

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body, req.ip);
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body, req.ip);
      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.loginWithGoogle(req.body.credential, req.ip);
      res.status(200).json({
        success: true,
        message: "Google authentication successful",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }
      const profile = await AuthService.getCurrentUser(req.user._id.toString());
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPublicProfiles(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profiles = await AuthService.getRegisteredProfiles();
      res.status(200).json({
        success: true,
        data: profiles
      });
    } catch (error) {
      next(error);
    }
  }

  public static async quickLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: "Email is required for profile login." });
        return;
      }
      const result = await AuthService.quickLogin(email, req.ip);
      res.status(200).json({
        success: true,
        message: "Profile login successful",
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
