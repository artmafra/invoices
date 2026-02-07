"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";

/**
 * Session context type that wraps next-auth's session with update function
 */
export interface SessionContextType {
  session: Session | null;
  status: "authenticated" | "loading" | "unauthenticated";
  update: (data?: any) => Promise<Session | null>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionContextProviderProps {
  children: ReactNode;
}

/**
 * SessionContextProvider wraps next-auth's useSession to provide session data
 * via context, eliminating redundant session fetches across pages.
 *
 * Should be placed in admin layout after AuthProvider (SessionProvider).
 * Exposes session, status, and update function via context.
 */
export function SessionContextProvider({ children }: SessionContextProviderProps) {
  const { data: session, status, update } = useSession();

  return (
    <SessionContext.Provider value={{ session, status, update }}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session from context without triggering a fetch.
 * Must be used within SessionContextProvider.
 *
 * @throws Error if used outside SessionContextProvider
 * @returns Session context with session data, status, and update function
 */
export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessionContext must be used within SessionContextProvider");
  }
  return context;
}
