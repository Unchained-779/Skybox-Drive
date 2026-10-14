import mongoose from "mongoose";
import dns from "dns";
import { env } from "./env";

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const connectionUri = uri || env.MONGODB_URI;
  try {
    // Fix Node.js DNS resolution timeout for MongoDB Atlas SRV records
    if (connectionUri.startsWith("mongodb+srv")) {
      try {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
      } catch {
        // Fallback silently if environment restricts custom DNS
      }
    }
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
