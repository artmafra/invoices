import type { ReactElement } from "react";
import { render } from "@react-email/components";

/**
 * Render a React Email template to HTML string.
 */
export async function renderEmail(template: ReactElement): Promise<string> {
  return render(template);
}

/**
 * Render a React Email template to plain text.
 */
export async function renderEmailText(template: ReactElement): Promise<string> {
  return render(template, { plainText: true });
}

/**
 * Render a React Email template to both HTML and plain text.
 */
export async function renderEmailBoth(
  template: ReactElement,
): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([render(template), render(template, { plainText: true })]);

  return { html, text };
}
