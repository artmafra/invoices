/**
 * Email Test Script
 *
 * Test Gmail integration by sending a test email.
 *
 * Usage:
 *   npm run test:email -- --to recipient@example.com
 *   npm run test:email -- --to recipient@example.com --json
 *
 * Options:
 *   --to      Recipient email address (required)
 *   --subject Email subject (optional, defaults to "Test Email")
 *   --json    Output as JSON
 *   --help    Show usage information
 */

import "dotenv/config";
import { getGmailStatus, isGmailConfigured, sendEmail } from "@/lib/gmail";
import { renderEmailBoth } from "@/emails/render";
import { TestEmail } from "@/emails/test-email";
import { getBooleanArg, getStringArg, parseArgs, printUsage } from "../lib/args";

const OPTIONS = [
  { flag: "to", description: "Recipient email address", required: true },
  { flag: "subject", description: "Email subject (default: 'Test Email')" },
  { flag: "json", description: "Output as JSON" },
  { flag: "help", description: "Show usage information" },
];

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    from: string | null;
    to: string;
    subject: string;
  };
  error?: string;
}

async function main() {
  const args = parseArgs();

  if (getBooleanArg(args, "help")) {
    printUsage("test:email", OPTIONS);
    process.exit(0);
  }

  const jsonOutput = getBooleanArg(args, "json");
  const to = getStringArg(args, "to");
  const subject = getStringArg(args, "subject") || "Test Email";

  const output = (result: TestResult) => {
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.success) {
        console.log(`\n✅ ${result.message}`);
        if (result.details) {
          console.log(`   From: ${result.details.from}`);
          console.log(`   To: ${result.details.to}`);
          console.log(`   Subject: ${result.details.subject}`);
        }
      } else {
        console.error(`\n❌ ${result.message}`);
        if (result.error) {
          console.error(`   Error: ${result.error}`);
        }
      }
    }
  };

  // Validate required args
  if (!to) {
    output({
      success: false,
      message: "Missing required argument: --to",
      error: "Please provide a recipient email address",
    });
    if (!jsonOutput) {
      printUsage("test:email", OPTIONS);
    }
    process.exit(1);
  }

  // Check if Gmail is configured
  if (!isGmailConfigured()) {
    output({
      success: false,
      message: "Gmail is not configured",
      error:
        "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, and GMAIL_FROM_EMAIL environment variables",
    });
    process.exit(1);
  }

  const gmailStatus = getGmailStatus();

  try {
    if (!jsonOutput) {
      console.log(`\n📧 Sending test email to ${to}...`);
    }

    // Render the test email template
    const { html, text } = await renderEmailBoth(
      TestEmail({
        sentAt: new Date().toLocaleString(),
      }),
    );

    // Send the email
    const success = await sendEmail({
      to,
      subject,
      html,
      text,
    });

    if (success) {
      output({
        success: true,
        message: "Test email sent successfully!",
        details: {
          from: gmailStatus.email,
          to,
          subject,
        },
      });
      process.exit(0);
    } else {
      output({
        success: false,
        message: "Failed to send test email",
        error: "sendEmail returned false",
      });
      process.exit(1);
    }
  } catch (error) {
    output({
      success: false,
      message: "Failed to send test email",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();
