import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

let mongoServer: MongoMemoryServer;

export const setupTestDB = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    // Clean test storage directories
    const testStorage = path.resolve(__dirname, "../storage_data");
    const testTemp = path.resolve(__dirname, "../storage_temp");
    if (fs.existsSync(testStorage)) {
      fs.rmSync(testStorage, { recursive: true, force: true });
    }
    if (fs.existsSync(testTemp)) {
      fs.rmSync(testTemp, { recursive: true, force: true });
    }
  });
};
