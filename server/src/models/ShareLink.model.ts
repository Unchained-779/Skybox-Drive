import mongoose, { Document, Schema, Types } from "mongoose";

export interface IShareLink extends Document {
  resourceType: "file" | "folder";
  resourceId: Types.ObjectId;
  token: string;
  role: "viewer" | "editor";
  createdBy: Types.ObjectId;
  expiresAt: Date | null;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const shareLinkSchema = new Schema<IShareLink>(
  {
    resourceType: {
      type: String,
      enum: ["file", "folder"],
      required: true
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    role: {
      type: String,
      enum: ["viewer", "editor"],
      default: "viewer"
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    expiresAt: {
      type: Date,
      default: null
    },
    accessCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const ShareLink = mongoose.model<IShareLink>("ShareLink", shareLinkSchema);
