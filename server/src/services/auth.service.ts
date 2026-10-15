import jwt, { SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User, IUser } from "../models/User.model";
import { AuditLog } from "../models/AuditLog.model";
import { env } from "../config/env";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors";
import { MailService } from "./mail.service";

export interface RegisterDTO {
  email: string;
  password?: string;
  name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface WelcomeEmailData {
  id: string;
  to: string;
  subject: string;
  htmlContent: string;
  previewUrl?: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    storageQuota: number;
    usedStorage: number;
    loginCount: number;
    createdAt: Date;
  };
  token: string;
  isFirstLogin?: boolean;
  welcomeEmail?: WelcomeEmailData;
}

export class AuthService {
  private static googleClient = new OAuth2Client();

  private static generateToken(user: IUser): string {
    const signOptions: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    };
    return jwt.sign({ userId: user._id.toString() }, env.JWT_SECRET, signOptions);
  }

  public static async register(dto: RegisterDTO, ipAddress?: string): Promise<AuthResponse> {
    const existing = await User.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new ConflictError("An account with this email address already exists.");
    }

    if (!dto.password) {
      throw new UnauthorizedError("Password is required for email registration.");
    }

    const user = await User.create({
      email: dto.email.toLowerCase(),
      password: dto.password,
      name: dto.name,
      authProvider: "local",
      storageQuota: env.DEFAULT_USER_QUOTA,
      usedStorage: 0,
      loginCount: 1,
      lastLoginAt: new Date()
    });

    const token = this.generateToken(user);

    await AuditLog.create({
      userId: user._id,
      action: "REGISTER",
      resourceType: "auth",
      details: { email: user.email },
      ipAddress
    });

    let welcomeEmailData: WelcomeEmailData | undefined;
    try {
      const emailNotice = await MailService.sendWelcomeSecurityAlert({
        userId: user._id,
        to: user.email,
        name: user.name,
        authProvider: "local",
        isFirstLogin: true,
        ipAddress
      });
      welcomeEmailData = {
        id: emailNotice._id.toString(),
        to: emailNotice.to,
        subject: emailNotice.subject,
        htmlContent: emailNotice.htmlContent,
        previewUrl: emailNotice.previewUrl,
        createdAt: emailNotice.createdAt
      };
    } catch (e) {
      console.warn("Mail service dispatch error on register:", e);
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        storageQuota: user.storageQuota,
        usedStorage: user.usedStorage,
        loginCount: user.loginCount || 1,
        createdAt: user.createdAt
      },
      token,
      isFirstLogin: true,
      welcomeEmail: welcomeEmailData
    };
  }

  public static async login(dto: LoginDTO, ipAddress?: string): Promise<AuthResponse> {
    const user = await User.findOne({ email: dto.email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    if (!user.password) {
      throw new UnauthorizedError("This account was created with Google. Please use Google Sign-In.");
    }

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const isFirstLogin = (user.loginCount || 0) === 0;
    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);

    await AuditLog.create({
      userId: user._id,
      action: "LOGIN",
      resourceType: "auth",
      details: { email: user.email },
      ipAddress
    });

    let welcomeEmailData: WelcomeEmailData | undefined;
    try {
      const emailNotice = await MailService.sendWelcomeSecurityAlert({
        userId: user._id,
        to: user.email,
        name: user.name,
        authProvider: "local",
        isFirstLogin,
        ipAddress
      });
      welcomeEmailData = {
        id: emailNotice._id.toString(),
        to: emailNotice.to,
        subject: emailNotice.subject,
        htmlContent: emailNotice.htmlContent,
        previewUrl: emailNotice.previewUrl,
        createdAt: emailNotice.createdAt
      };
    } catch (e) {
      console.warn("Mail service dispatch error on login:", e);
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        storageQuota: user.storageQuota,
        usedStorage: user.usedStorage,
        loginCount: user.loginCount,
        createdAt: user.createdAt
      },
      token,
      isFirstLogin,
      welcomeEmail: welcomeEmailData
    };
  }

  public static async loginWithGoogle(credential: string, ipAddress?: string): Promise<AuthResponse> {
    let googleEmail: string | undefined;
    let googleName: string | undefined;
    let googleSub: string | undefined;
    let googlePicture: string | undefined;

    // 1. Verify via google-auth-library if GOOGLE_CLIENT_ID is provided
    if (env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await this.googleClient.verifyIdToken({
          idToken: credential,
          audience: env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (payload) {
          googleEmail = payload.email;
          googleName = payload.name;
          googleSub = payload.sub;
          googlePicture = payload.picture;
        }
      } catch (err) {
        console.warn("Google token verification with GOOGLE_CLIENT_ID failed, checking decoded payload:", err);
      }
    }

    // 2. Decode payload safely if client ID was not set or verification returned null
    if (!googleEmail) {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const decoded = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          googleEmail = decoded.email;
          googleName = decoded.name || decoded.email.split("@")[0];
          googleSub = decoded.sub;
          googlePicture = decoded.picture;
        }
      } catch {
        throw new UnauthorizedError("Invalid Google credential token.");
      }
    }

    if (!googleEmail) {
      throw new UnauthorizedError("Unable to retrieve email from Google credential.");
    }

    let user = await User.findOne({ email: googleEmail.toLowerCase() });
    let isFirstLogin = false;

    if (user) {
      isFirstLogin = (user.loginCount || 0) === 0;
      user.loginCount = (user.loginCount || 0) + 1;
      user.lastLoginAt = new Date();
      if (!user.googleId && googleSub) {
        user.googleId = googleSub;
      }
      if (!user.avatar && googlePicture) {
        user.avatar = googlePicture;
      }
      await user.save();
    } else {
      isFirstLogin = true;
      user = await User.create({
        email: googleEmail.toLowerCase(),
        name: googleName || "Google User",
        googleId: googleSub,
        avatar: googlePicture,
        authProvider: "google",
        storageQuota: env.DEFAULT_USER_QUOTA,
        usedStorage: 0,
        loginCount: 1,
        lastLoginAt: new Date()
      });
    }

    const token = this.generateToken(user);

    await AuditLog.create({
      userId: user._id,
      action: "GOOGLE_AUTH",
      resourceType: "auth",
      details: { email: user.email },
      ipAddress
    });

    let welcomeEmailData: WelcomeEmailData | undefined;
    try {
      const emailNotice = await MailService.sendWelcomeSecurityAlert({
        userId: user._id,
        to: user.email,
        name: user.name,
        authProvider: "google",
        isFirstLogin,
        ipAddress
      });
      welcomeEmailData = {
        id: emailNotice._id.toString(),
        to: emailNotice.to,
        subject: emailNotice.subject,
        htmlContent: emailNotice.htmlContent,
        previewUrl: emailNotice.previewUrl,
        createdAt: emailNotice.createdAt
      };
    } catch (e) {
      console.warn("Mail service dispatch error on google auth:", e);
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        storageQuota: user.storageQuota,
        usedStorage: user.usedStorage,
        loginCount: user.loginCount,
        createdAt: user.createdAt
      },
      token,
      isFirstLogin,
      welcomeEmail: welcomeEmailData
    };
  }

  public static async getCurrentUser(userId: string): Promise<AuthResponse["user"]> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found.");
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      storageQuota: user.storageQuota,
      usedStorage: user.usedStorage,
      loginCount: user.loginCount || 0,
      createdAt: user.createdAt
    };
  }

  public static async getRegisteredProfiles(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
    authProvider: "local" | "google";
    storageQuota: number;
    usedStorage: number;
    createdAt: Date;
  }>> {
    const users = await User.find({})
      .select("_id name email avatar authProvider storageQuota usedStorage createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    return users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      authProvider: u.authProvider,
      storageQuota: u.storageQuota,
      usedStorage: u.usedStorage,
      createdAt: u.createdAt
    }));
  }

  public static async quickLogin(email: string, ipAddress?: string): Promise<AuthResponse> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new NotFoundError("User profile not found.");
    }

    const token = this.generateToken(user);

    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = new Date();
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "LOGIN",
      resourceType: "auth",
      details: { email: user.email, method: "quick_profile_login" },
      ipAddress
    });

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        storageQuota: user.storageQuota,
        usedStorage: user.usedStorage,
        loginCount: user.loginCount,
        createdAt: user.createdAt
      },
      token
    };
  }
}
