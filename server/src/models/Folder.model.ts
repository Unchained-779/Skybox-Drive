import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFolderShare {
  userId: Types.ObjectId;
  role: "viewer" | "editor";
}

export interface IFolder extends Document {
  name: string;
  parentId: Types.ObjectId | null;
  ownerId: Types.ObjectId;
  ancestors: Types.ObjectId[];
  isTrash: boolean;
  trashedAt: Date | null;
  sharedWith: IFolderShare[];
  createdAt: Date;
  updatedAt: Date;
}

const folderShareSchema = new Schema<IFolderShare>(
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

const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },
    parentId: {
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
    ancestors: [
      {
        type: Schema.Types.ObjectId,
        ref: "Folder",
        index: true
      }
    ],
    isTrash: {
      type: Boolean,
      default: false,
      index: true
    },
    trashedAt: {
      type: Date,
      default: null
    },
    sharedWith: [folderShareSchema]
  },
  {
    timestamps: true
  }
);

// Partial unique compound index: Prevents duplicate folder names under the same parent ONLY for active folders
folderSchema.index(
  { ownerId: 1, parentId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isTrash: false } }
);

// Index for listing shared folders quickly
folderSchema.index({ "sharedWith.userId": 1 });

export const Folder = mongoose.model<IFolder>("Folder", folderSchema);
