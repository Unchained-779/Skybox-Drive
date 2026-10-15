import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/skybox-drive"),
  JWT_SECRET: z.string().default("skybox_ultra_secret_jwt_key_2026_super_secure"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default(path.resolve(__dirname, "../../storage_data")),
  DEFAULT_USER_QUOTA: z.string().default("104857600").transform((val) => parseInt(val, 10)), // 100 MB default
  CORS_ORIGIN: z.string().default("*"),
  GOOGLE_CLIENT_ID: z.string().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
