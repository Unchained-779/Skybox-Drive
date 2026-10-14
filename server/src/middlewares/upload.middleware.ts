import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { Request } from "express";

const tempUploadDir = path.resolve(__dirname, "../../storage_temp");
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req: Request, _file: Express.Multer.File, cb) => {
    // Save to temp storage with a random uuid so filenames never collide or traverse
    const tempName = `temp_${uuidv4()}`;
    cb(null, tempName);
  }
});

// Default max file size 50MB per single file (can be overridden)
export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});
