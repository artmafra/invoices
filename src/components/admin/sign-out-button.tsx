"use client";

import { signOut } from "@/lib/auth-client";

export default function SignOutButton() {
  const handleSignOut = async () => {
    await signOut("/admin/login");
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
