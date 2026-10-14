import { app } from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Skybox Drive Server running on http://localhost:${env.PORT}`);
      console.log(`📖 API Documentation available at http://localhost:${env.PORT}/api-docs`);
    });

    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDB();
        console.log("🔒 Database disconnected. Process terminated cleanly.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
