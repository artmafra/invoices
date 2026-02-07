"use client";

import { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export default function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
