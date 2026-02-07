import { google } from "googleapis";
import { logger } from "@/lib/logger";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create OAuth2 client for Gmail API using environment-based credentials
 */
function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return oauth2Client;
}

/**
 * Check if Gmail is configured via environment variables
 */
export function isGmailConfigured(): boolean {
  return !!(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.GMAIL_FROM_EMAIL
  );
}

/**
 * Get Gmail configuration status for display
 */
export function getGmailStatus(): {
  isConfigured: boolean;
  email: string | null;
  status: "not_configured" | "configured";
} {
  if (!isGmailConfigured()) {
    return {
      isConfigured: false,
      email: null,
      status: "not_configured",
    };
  }

  return {
    isConfigured: true,
    email: process.env.GMAIL_FROM_EMAIL || null,
    status: "configured",
  };
}

/**
 * Send email using Gmail API with environment-based credentials
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isGmailConfigured()) {
    throw new Error(
      "Gmail is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_FROM_EMAIL environment variables.",
    );
  }

  try {
    const oauth2Client = createOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const message = createEmailMessage({
      from: process.env.GMAIL_FROM_EMAIL || "",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: message,
      },
    });

    return !!result.data.id;
  } catch (error) {
    logger.error({ error, to: options.to, subject: options.subject }, "Error sending email");

    if (
      error instanceof Error &&
      (error.message.includes("invalid_grant") ||
        error.message.includes("invalid_token") ||
        error.message.includes("Token has been expired"))
    ) {
      throw new Error(
        "Gmail refresh token is invalid or expired. Please generate a new refresh token.",
      );
    }

    throw new Error("Failed to send email");
  }
}

/**
 * Create base64 encoded email message for Gmail API
 */
function createEmailMessage(options: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): string {
  const { from, to, subject, html, text } = options;

  const message = [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`, "MIME-Version: 1.0"];

  if (text && html) {
    // Multipart message with both text and HTML
    const boundary = "----=_Part_0_" + Math.random().toString().substr(2);
    message.push(
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      text,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
      "",
      `--${boundary}--`,
    );
  } else if (html) {
    // HTML only
    message.push("Content-Type: text/html; charset=utf-8", "", html);
  } else {
    // Text only
    message.push("Content-Type: text/plain; charset=utf-8", "", text || "");
  }

  const rawMessage = message.join("\n");
  return Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Test Gmail connection with stored credentials
 */
export async function testGmailConnection(): Promise<boolean> {
  if (!isGmailConfigured()) {
    return false;
  }

  try {
    const oauth2Client = createOAuth2Client();
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Try to get user profile to test connection
    const response = await gmail.users.getProfile({ userId: "me" });

    // If we get a valid response with an email, connection is working
    return !!(response.data && response.data.emailAddress);
  } catch (error) {
    logger.error({ error }, "Gmail connection test failed");
    return false;
  }
}
