"use client";

import { createContext, useContext, type ReactNode } from "react";

const NonceContext = createContext<string>("");

interface NonceProviderProps {
  children: ReactNode;
  nonce: string;
}

export function NonceProvider({ children, nonce }: NonceProviderProps) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}

/**
 * Get the CSP nonce in client components.
 * Must be used within a NonceProvider.
 */
export function useNonce(): string {
  return useContext(NonceContext);
}
