import mongoose, { Document, Schema } from "mongoose";

export interface ISecurityNotification extends Document {
  userId: mongoose.Types.ObjectId;
  to: string;
  subject: string;
  htmlContent: string;
  type: "welcome_first_login" | "security_alert" | "share_notice" | "share_invite";
  previewUrl?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const securityNotificationSchema = new Schema<ISecurityNotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    subject: {
      type: String,
      required: true
    },
    htmlContent: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["welcome_first_login", "security_alert", "share_notice", "share_invite"],
      default: "welcome_first_login"
    },
    previewUrl: {
      type: String,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

export const SecurityNotification = mongoose.model<ISecurityNotification>(
  "SecurityNotification",
  securityNotificationSchema
);
