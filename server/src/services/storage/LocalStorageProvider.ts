import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { IStorageProvider, SaveFileResult, ByteRange } from "../../interfaces/IStorageProvider";
import { env } from "../../config/env";

export class LocalStorageProvider implements IStorageProvider {
  private readonly storageDir: string;

  constructor(customStorageDir?: string) {
    this.storageDir = customStorageDir || env.STORAGE_LOCAL_PATH;
    this.ensureDirectoryExists(this.storageDir);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getSafeFilePath(key: string): string {
    // Sanitize key to prevent path traversal
    const safeKey = path.basename(key);
    return path.join(this.storageDir, safeKey);
  }

  public async saveFile(tempFilePath: string, customKey?: string): Promise<SaveFileResult> {
    const key = customKey || uuidv4();
    const destinationPath = this.getSafeFilePath(key);

    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const readStream = fs.createReadStream(tempFilePath);
      const writeStream = fs.createWriteStream(destinationPath);

      let bytesWritten = 0;

      readStream.on("data", (chunk: Buffer | string) => {
        hash.update(chunk);
        bytesWritten += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
      });

      readStream.on("error", (err) => {
        writeStream.end();
        reject(err);
      });

      writeStream.on("error", (err) => {
        reject(err);
      });

      writeStream.on("finish", async () => {
        const checksum = hash.digest("hex");
        try {
          // Unlink temporary file safely
          if (fs.existsSync(tempFilePath)) {
            await fs.promises.unlink(tempFilePath);
          }
          resolve({
            storageKey: key,
            size: bytesWritten,
            checksum
          });
        } catch (cleanupErr) {
          console.warn("Failed to remove temporary file:", cleanupErr);
          resolve({
            storageKey: key,
            size: bytesWritten,
            checksum
          });
        }
      });

      readStream.pipe(writeStream);
    });
  }

  public async getFileStream(key: string, range?: ByteRange): Promise<Readable> {
    const filePath = this.getSafeFilePath(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File with key "${key}" not found on storage.`);
    }

    if (range) {
      return fs.createReadStream(filePath, { start: range.start, end: range.end });
    }

    return fs.createReadStream(filePath);
  }

  public async deleteFile(key: string): Promise<boolean> {
    const filePath = this.getSafeFilePath(key);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    await fs.promises.unlink(filePath);
    return true;
  }

  public async fileExists(key: string): Promise<boolean> {
    const filePath = this.getSafeFilePath(key);
    return fs.existsSync(filePath);
  }

  public async getFileSize(key: string): Promise<number> {
    const filePath = this.getSafeFilePath(key);
    const stat = await fs.promises.stat(filePath);
    return stat.size;
  }
}

// Singleton storage instance
export const storageService = new LocalStorageProvider();
