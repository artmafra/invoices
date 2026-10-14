import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export interface TwoFactorChallenge {
  token: string;
  userId: string;
  email: string;
  availableMethods: {
    email: boolean;
    totp: boolean;
    backup: boolean;
    preferred?: string;
  };
}

export type CredentialsSignInResult =
  | { status: "success" }
  | ({ status: "two-factor" } & TwoFactorChallenge)
  | { status: "invalid" }
  | { status: "error" };

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(`/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
}

/** Email + password. Resolves with a 2FA challenge when a second factor is required. */
export async function signInWithCredentials(
  email: string,
  password: string,
): Promise<CredentialsSignInResult> {
  try {
    const response = await postJson("/sign-in/credentials", { email, password });
    if (response.status === 401) return { status: "invalid" };
    if (!response.ok) return { status: "error" };

    const data = await response.json();
    if (data.twoFactorRequired) {
      return {
        status: "two-factor",
        token: data.token,
        userId: data.userId,
        email: data.email,
        availableMethods: data.availableMethods,
      };
    }
    return { status: "success" };
  } catch {
    return { status: "error" };
  }
}

/** Second step of the credentials flow. Returns true when the session was created. */
export async function signInWithTwoFactor(params: {
  token: string;
  code: string;
  method?: "email" | "totp" | "backup";
}): Promise<boolean> {
  try {
    const response = await postJson("/sign-in/two-factor", params);
    return response.ok;
  } catch {
    return false;
  }
}

/** Completes a passkey sign-in using the token returned by passkey verification. */
export async function signInWithPasskey(params: {
  userId: string;
  verificationToken: string;
}): Promise<boolean> {
  try {
    const response = await postJson("/sign-in/passkey", params);
    return response.ok;
  } catch {
    return false;
  }
}

/** Starts the Google OAuth flow; failures return to the login page with ?error=<code>. */
export function signInWithGoogle() {
  return authClient.signIn.social({
    provider: "google",
    callbackURL: "/admin",
    errorCallbackURL: "/admin/login",
  });
}

/** Deletes the session server-side and navigates (hard) to the given URL. */
export async function signOut(callbackUrl = "/admin/login") {
  try {
    await authClient.signOut();
  } finally {
    window.location.href = callbackUrl;
  }
}
