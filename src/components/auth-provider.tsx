"use client";

import { SessionContextProvider } from "@/contexts/session-context";
import type { Session } from "@/types/auth/session.types";

export default function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return <SessionContextProvider initialSession={session}>{children}</SessionContextProvider>;
}
