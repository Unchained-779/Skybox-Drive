import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const connectionUri = uri || env.MONGODB_URI;
  try {
    const conn = await mongoose.connect(connectionUri);
    if (env.NODE_ENV !== "test") {
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    }
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    if (env.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
