import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFileShare {
  userId: Types.ObjectId;
  role: "viewer" | "editor";
}

export interface IFileVersion {
  versionNumber: number;
  storageKey: string;
  size: number;
  checksum: string;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
}

export interface IFile extends Document {
  name: string;
  folderId: Types.ObjectId | null;
  ownerId: Types.ObjectId;
  size: number;
  mimeType: string;
  storageKey: string;
  checksum: string;
  isTrash: boolean;
  trashedAt: Date | null;
  sharedWith: IFileShare[];
  currentVersion: number;
  versions: IFileVersion[];
  createdAt: Date;
  updatedAt: Date;
}

const fileShareSchema = new Schema<IFileShare>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["viewer", "editor"],
      default: "viewer"
    }
  },
  { _id: false }
);

const fileVersionSchema = new Schema<IFileVersion>(
  {
    versionNumber: {
      type: Number,
      required: true
    },
    storageKey: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    checksum: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const fileSchema = new Schema<IFile>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
      index: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    mimeType: {
      type: String,
      default: "application/octet-stream"
    },
    storageKey: {
      type: String,
      required: true,
      index: true
    },
    checksum: {
      type: String,
      required: true
    },
    isTrash: {
      type: Boolean,
      default: false,
      index: true
    },
    trashedAt: {
      type: Date,
      default: null
    },
    sharedWith: [fileShareSchema],
    currentVersion: {
      type: Number,
      default: 1
    },
    versions: [fileVersionSchema]
  },
  {
    timestamps: true
  }
);

// Partial unique compound index: Prevents duplicate active file names inside the same folder
fileSchema.index(
  { ownerId: 1, folderId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isTrash: false } }
);

// Fast search & filter index
fileSchema.index({ ownerId: 1, isTrash: 1, mimeType: 1 });
fileSchema.index({ "sharedWith.userId": 1 });

export const File = mongoose.model<IFile>("File", fileSchema);
