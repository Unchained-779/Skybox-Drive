import jwt, { SignOptions } from "jsonwebtoken";
import { User, IUser } from "../models/User.model";
import { AuditLog } from "../models/AuditLog.model";
import { env } from "../config/env";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors";

export interface RegisterDTO {
  email: string;
  password: string;
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
    storageQuota: number;
    usedStorage: number;
    createdAt: Date;
  };
  token: string;
}

export class AuthService {
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

    const user = await User.create({
      email: dto.email.toLowerCase(),
      password: dto.password,
      name: dto.name,
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
      storageQuota: user.storageQuota,
      usedStorage: user.usedStorage,
      createdAt: user.createdAt
    };
  }
}
