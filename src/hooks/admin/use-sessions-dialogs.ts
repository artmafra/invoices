"use client";

import { useState } from "react";
import type { UserSessionResponse } from "@/types/sessions/sessions.types";

/**
 * Dialog state for sessions management
 * Consolidates 2 separate state variables into a single hook (Finding #10)
 */
export interface SessionsDialogState {
  // Revoke single session
  sessionToRevoke: UserSessionResponse | null;

  // Revoke all sessions for a user
  userToRevokeAll: {
    id: string;
    name: string | null;
    email: string;
    sessionCount: number;
  } | null;
}

/**
 * Hook to manage all session dialog states and their open/close handlers
 * Reduces modal state complexity from 2 separate useState calls to 1 hook
 */
export function useSessionsDialogs() {
  // Revoke single session state
  const [sessionToRevoke, setSessionToRevoke] = useState<UserSessionResponse | null>(null);

  // Revoke all sessions state
  const [userToRevokeAll, setUserToRevokeAll] = useState<{
    id: string;
    name: string | null;
    email: string;
    sessionCount: number;
  } | null>(null);

  return {
    // State
    dialogs: {
      sessionToRevoke,
      userToRevokeAll,
    },

    // Revoke single session actions
    openRevokeSession: (session: UserSessionResponse) => setSessionToRevoke(session),
    closeRevokeSession: () => setSessionToRevoke(null),

    // Revoke all sessions actions
    openRevokeAllSessions: (user: {
      id: string;
      name: string | null;
      email: string;
      sessionCount: number;
    }) => setUserToRevokeAll(user),
    closeRevokeAllSessions: () => setUserToRevokeAll(null),

    // Close all dialogs (utility)
    closeAll: () => {
      setSessionToRevoke(null);
      setUserToRevokeAll(null);
    },
  };
}
