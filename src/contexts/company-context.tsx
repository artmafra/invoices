"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { COOKIE_NAMES, setCookie } from "@/lib/preferences/cookies";

interface CompanyContextValue {
  selectedCompanyId: string | null;
  selectedCompanyName: string | null;
  setSelectedCompany: (id: string | null, name: string | null) => void;
  /** @deprecated use setSelectedCompany */
  setSelectedCompanyId: (id: string | null) => void;
}

const companyContext = createContext<CompanyContextValue | null>(null);

interface CompanyProviderProps {
  children: ReactNode;
  initialSelectedCompanyId: string | null;
  initialSelectedCompanyName?: string | null;
}

export function CompanyProvider({
  children,
  initialSelectedCompanyId = null,
  initialSelectedCompanyName = null,
}: CompanyProviderProps) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(
    initialSelectedCompanyId,
  );
  const [selectedCompanyName, setSelectedCompanyNameState] = useState<string | null>(
    initialSelectedCompanyName,
  );
  const queryClient = useQueryClient();

  function setSelectedCompany(id: string | null, name: string | null) {
    setSelectedCompanyIdState(id);
    setSelectedCompanyNameState(name);
    setCookie(COOKIE_NAMES.selectedCompanyId, id ?? "");
    setCookie(COOKIE_NAMES.selectedCompanyName, name ?? "");
    queryClient.invalidateQueries();
  }

  function setSelectedCompanyId(id: string | null) {
    setSelectedCompany(id, null);
  }

  return (
    <companyContext.Provider
      value={{ selectedCompanyId, selectedCompanyName, setSelectedCompany, setSelectedCompanyId }}
    >
      {children}
    </companyContext.Provider>
  );
}

export function useSelectedCompany(): CompanyContextValue {
  const context = useContext(companyContext);
  if (!context) {
    throw new Error("useSelectedCompany must be used within a CompanyProvider");
  }
  return context;
}
