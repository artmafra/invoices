import { headers } from "next/headers";

/**
 * Get the CSP nonce from request headers.
 * The nonce is generated in proxy.ts and set as x-nonce header.
 * Must be called from a Server Component or Server Action.
 */
export async function getNonce(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-nonce") ?? "";
}
