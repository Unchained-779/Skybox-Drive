import nodemailer, { Transporter } from "nodemailer";
import mongoose from "mongoose";
import { SecurityNotification, ISecurityNotification } from "../models/SecurityNotification.model";

export interface SendSecurityEmailParams {
  userId: mongoose.Types.ObjectId;
  to: string;
  name: string;
  authProvider: "google" | "local";
  isFirstLogin: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export class MailService {
  private static transporter: Transporter | null = null;

  private static async getTransporter(): Promise<Transporter> {
    if (process.env.NODE_ENV === "test") {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      return this.transporter;
    }

    if (!this.transporter) {
      // Check if SMTP environment variables exist
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: { user, pass }
        });
      } else {
        // Create an automated Ethereal / Stream transporter for development and instant previews
        try {
          const testAccount = await nodemailer.createTestAccount();
          this.transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass
            }
          });
        } catch {
          // Fallback to JSON stream transport if network DNS blocks Ethereal
          this.transporter = nodemailer.createTransport({
            jsonTransport: true
          });
        }
      }
    }
    return this.transporter;
  }

  public static async sendWelcomeSecurityAlert(
    params: SendSecurityEmailParams
  ): Promise<ISecurityNotification> {
    const { userId, to, name, authProvider, isFirstLogin, ipAddress, userAgent } = params;

    const subject = isFirstLogin
      ? `🛡️ Welcome to Skybox Drive: Security confirmation for ${to}`
      : `🛡️ Security alert: New sign-in detected for ${to}`;

    const timestamp = new Date().toUTCString();
    const loginMethod = authProvider === "google" ? "Google OAuth 2.0 (Gmail)" : "Email & Password";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #141e33; border: 1px solid #24324a; border-radius: 12px; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #24324a; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; }
    .title { font-size: 18px; font-weight: 700; color: #ffffff; margin: 0; }
    .info-table { width: 100%; border-collapse: collapse; margin: 18px 0; background: rgba(15, 23, 42, 0.6); border-radius: 8px; overflow: hidden; }
    .info-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #24324a; }
    .info-label { color: #94a3b8; font-weight: 600; width: 35%; }
    .info-val { color: #f8fafc; font-weight: 500; }
    .footer { font-size: 11px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #24324a; padding-top: 14px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">${isFirstLogin ? "Welcome & Security" : "Security Notice"}</span>
      <h2 class="title">Skybox Drive Security Team</h2>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
      Hi <strong>${name}</strong>,
    </p>

    <p style="font-size: 13px; line-height: 1.6; color: #cbd5e1;">
      ${
        isFirstLogin
          ? "Welcome to Skybox Drive! Your new cloud storage account was registered successfully and allocated <strong>100 MB</strong> of free cloud quota."
          : "We noticed a new sign-in to your Skybox Drive account."
      }
    </p>

    <table class="info-table">
      <tr>
        <td class="info-label">Account Email</td>
        <td class="info-val">${to}</td>
      </tr>
      <tr>
        <td class="info-label">Authentication Method</td>
        <td class="info-val">${loginMethod}</td>
      </tr>
      <tr>
        <td class="info-label">IP Address</td>
        <td class="info-val">${ipAddress || "127.0.0.1 (Localhost)"}</td>
      </tr>
      <tr>
        <td class="info-label">Browser / Client</td>
        <td class="info-val">${userAgent || "Desktop Browser"}</td>
      </tr>
      <tr>
        <td class="info-label">Timestamp</td>
        <td class="info-val">${timestamp}</td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
      If this was you, no action is required. If you did not authorize this login, please revoke your sessions and reset your credentials immediately.
    </p>

    <div class="footer">
      Skybox Drive &copy; 2026. Automated Security Notification System.
    </div>
  </div>
</body>
</html>
    `;

    let previewUrl: string | undefined;

    try {
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail({
        from: '"Skybox Security Team" <security@skybox.io>',
        to,
        subject,
        html: htmlContent
      });

      const etherealUrl = nodemailer.getTestMessageUrl(info);
      if (etherealUrl) {
        previewUrl = etherealUrl;
        console.log(`✉️ [MailService] Sent security email to ${to}. Preview: ${previewUrl}`);
      } else {
        console.log(`✉️ [MailService] Sent security email to ${to} (MessageId: ${info.messageId})`);
      }
    } catch (err) {
      console.warn("⚠️ [MailService] Failed to send via transport, saving notification to database:", err);
    }

    // Save notification to database so it is guaranteed visible to the user in the UI!
    const notification = await SecurityNotification.create({
      userId,
      to,
      subject,
      htmlContent,
      type: isFirstLogin ? "welcome_first_login" : "security_alert",
      previewUrl,
      isRead: false,
      metadata: {
        authProvider,
        ipAddress,
        userAgent,
        timestamp
      }
    });

    return notification;
  }

  public static async sendShareInvitationEmail(params: {
    userId: mongoose.Types.ObjectId;
    to: string;
    inviterName: string;
    inviterEmail: string;
    resourceName: string;
    resourceType: "file" | "folder";
    role: "viewer" | "editor";
    shareUrl: string;
  }): Promise<ISecurityNotification> {
    const { userId, to, inviterName, inviterEmail, resourceName, resourceType, role, shareUrl } = params;

    const subject = `📁 ${inviterName} shared "${resourceName}" with you on Skybox Drive`;
    const timestamp = new Date().toUTCString();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #141e33; border: 1px solid #24324a; border-radius: 12px; padding: 28px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .logo { font-size: 20px; font-weight: 800; color: #3b82f6; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
    .header { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
    .file-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .file-name { font-size: 16px; font-weight: 700; color: #38bdf8; margin-bottom: 4px; }
    .file-meta { font-size: 13px; color: #64748b; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 6px; text-decoration: none; text-align: center; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <span>☁️ Skybox Drive</span>
    </div>
    <div class="header">Document Shared with You</div>
    <p class="lead">
      <strong>${inviterName}</strong> (<a href="mailto:${inviterEmail}" style="color: #60a5fa;">${inviterEmail}</a>) has invited you to view a ${resourceType} on Skybox Drive.
    </p>

    <div class="file-box">
      <div class="file-name">📄 ${resourceName}</div>
      <div class="file-meta">Permission: <strong>${role === "editor" ? "Editor (Can edit)" : "Viewer (Read only)"}</strong></div>
      <div class="file-meta">Shared on: ${timestamp}</div>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${shareUrl}" class="btn" target="_blank">View & Download Document</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
      Or paste this secure link directly into your browser:<br>
      <a href="${shareUrl}" style="color: #38bdf8;">${shareUrl}</a>
    </p>

    <div class="footer">
      Skybox Drive Cloud Storage • Secure Document Collaboration<br>
      Automated invitation sent on behalf of ${inviterEmail}
    </div>
  </div>
</body>
</html>
    `;

    let previewUrl: string | undefined = undefined;

    try {
      const transporter = await this.getTransporter();
      const info = await transporter.sendMail({
        from: `"${inviterName} via Skybox Drive" <share@skybox.io>`,
        to,
        subject,
        html: htmlContent
      });

      const etherealUrl = nodemailer.getTestMessageUrl(info);
      if (etherealUrl) {
        previewUrl = etherealUrl;
        console.log(`✉️ [MailService] Sent share invitation to ${to}. Preview: ${previewUrl}`);
      } else {
        console.log(`✉️ [MailService] Sent share invitation to ${to} (MessageId: ${info.messageId})`);
      }
    } catch (err) {
      console.warn("⚠️ [MailService] Failed to send via transport, saving notification to database:", err);
    }

    const notification = await SecurityNotification.create({
      userId,
      to,
      subject,
      htmlContent,
      type: "share_invite",
      previewUrl,
      isRead: false,
      metadata: {
        inviterName,
        inviterEmail,
        resourceName,
        resourceType,
        timestamp
      }
    });

    return notification;
  }
}

