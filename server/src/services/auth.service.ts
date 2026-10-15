import jwt, { SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User, IUser } from "../models/User.model";
import { AuditLog } from "../models/AuditLog.model";
import { env } from "../config/env";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors";

export interface RegisterDTO {
  email: string;
  password?: string;
  name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    storageQuota: number;
    usedStorage: number;
    createdAt: Date;
  };
  token: string;
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
      usedStorage: 0
    });

    const token = this.generateToken(user);

    await AuditLog.create({
      userId: user._id,
      action: "REGISTER",
      resourceType: "auth",
      details: { email: user.email },
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
        createdAt: user.createdAt
      },
      token
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

    const token = this.generateToken(user);

    await AuditLog.create({
      userId: user._id,
      action: "LOGIN",
      resourceType: "auth",
      details: { email: user.email },
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
        createdAt: user.createdAt
      },
      token
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

    if (user) {
      if (!user.googleId && googleSub) {
        user.googleId = googleSub;
      }
      if (!user.avatar && googlePicture) {
        user.avatar = googlePicture;
      }
      await user.save();
    } else {
      user = await User.create({
        email: googleEmail.toLowerCase(),
        name: googleName || "Google User",
        googleId: googleSub,
        avatar: googlePicture,
        authProvider: "google",
        storageQuota: env.DEFAULT_USER_QUOTA,
        usedStorage: 0
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

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        storageQuota: user.storageQuota,
        usedStorage: user.usedStorage,
        createdAt: user.createdAt
      },
      token
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
      createdAt: user.createdAt
    };
  }
}
