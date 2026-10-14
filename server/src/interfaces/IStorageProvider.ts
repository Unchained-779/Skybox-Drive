import { Readable } from "stream";

export interface SaveFileResult {
  storageKey: string;
  size: number;
  checksum: string;
}

export interface ByteRange {
  start: number;
  end: number;
}

export interface IStorageProvider {
  /**
   * Moves or saves a file to persistent storage, returning storageKey, size, and SHA-256 checksum.
   */
  saveFile(tempFilePath: string, customKey?: string): Promise<SaveFileResult>;

  /**
   * Returns a readable stream of the file content, optionally bounded by byte range (HTTP 206).
   */
  getFileStream(key: string, range?: ByteRange): Promise<Readable>;

  /**
   * Deletes a file from physical storage.
   */
  deleteFile(key: string): Promise<boolean>;

  /**
   * Checks whether the file exists in physical storage.
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Returns file size in bytes from physical storage.
   */
  getFileSize(key: string): Promise<number>;
}
