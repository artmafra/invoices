"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { COOKIE_NAMES, setCookie } from "@/lib/preferences/cookies";

interface CompanyContextValue {
  selectedCompanyId: string | null;
  setSelectedCompanyId: (id: string | null) => void;
}

const companyContext = createContext<CompanyContextValue | null>(null);

interface CompanyProviderProps {
  children: ReactNode;
  initialSelectedCompanyId: string | null;
}

export function CompanyProvider({
  children,
  initialSelectedCompanyId = null,
}: CompanyProviderProps) {
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(
    initialSelectedCompanyId,
  );
  const queryClient = useQueryClient();

  function setSelectedCompanyId(id: string | null) {
    setSelectedCompanyIdState(id);

    if (id) {
      setCookie(COOKIE_NAMES.selectedCompanyId, id);
    } else {
      setCookie(COOKIE_NAMES.selectedCompanyId, "");
    }

    queryClient.invalidateQueries();
  }

  return (
    <companyContext.Provider value={{ selectedCompanyId, setSelectedCompanyId }}>
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
