"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@/types/auth/session.types";

const REFETCH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Session context type. `update()` refetches the session from the server
 * (the server is the source of truth; arguments are ignored).
 */
export interface SessionContextType {
  session: Session | null;
  status: "authenticated" | "loading" | "unauthenticated";
  update: (data?: unknown) => Promise<Session | null>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionContextProviderProps {
  children: ReactNode;
  /** Session resolved on the server for the current render */
  initialSession: Session | null;
}

/**
 * Provides the current session via context, seeded by the server so pages never
 * wait on a client fetch. Refetches periodically and on `update()`.
 */
export function SessionContextProvider({ children, initialSession }: SessionContextProviderProps) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [lastInitialSession, setLastInitialSession] = useState(initialSession);

  // Server re-render (e.g. router.refresh()) delivers a newer session
  if (initialSession !== lastInitialSession) {
    setLastInitialSession(initialSession);
    setSession(initialSession);
  }

  const update = useCallback(async (): Promise<Session | null> => {
    try {
      const response = await fetch("/api/auth/get-session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return null;
      const next = (await response.json()) as Session | null;
      setSession(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(update, REFETCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [update]);

  const value = useMemo<SessionContextType>(
    () => ({
      session,
      status: session?.user ? "authenticated" : "unauthenticated",
      update,
    }),
    [session, update],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Hook to access session from context without triggering a fetch.
 * Must be used within SessionContextProvider.
 *
 * @throws Error if used outside SessionContextProvider
 */
export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessionContext must be used within SessionContextProvider");
  }
  return context;
}
