"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/revoke-session", { method: "POST" });
    } catch {
      // Best-effort: still proceed with client sign-out.
    }

    await signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-destructive hover:text-destructive/90 px-input-x py-input-y rounded border border-destructive/20 hover:bg-destructive/10 transition-colors"
    >
      Sign Out
    </button>
  );
}
