"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { CustomerIdentity, CustomerSessionResponse } from "@/lib/types";

type CustomerSessionStatus = "loading" | "authenticated" | "anonymous";

type CustomerSessionContextValue = {
  status: CustomerSessionStatus;
  customer: CustomerIdentity | null;
  refresh: () => Promise<void>;
};

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);

async function fetchCustomerSession() {
  const response = await fetch("/api/auth/session", {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar a sessão.");
  }

  return (await response.json()) as CustomerSessionResponse;
}

export function CustomerSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<CustomerSessionStatus>("loading");
  const [customer, setCustomer] = useState<CustomerIdentity | null>(null);

  const refresh = useCallback(async () => {
    try {
      const session = await fetchCustomerSession();

      if (session.authenticated) {
        setCustomer(session.customer);
        setStatus("authenticated");
        return;
      }
    } catch {
      // Falls through to anonymous state.
    }

    setCustomer(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  const value = useMemo(
    () => ({
      status,
      customer,
      refresh
    }),
    [customer, refresh, status]
  );

  return (
    <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  const context = useContext(CustomerSessionContext);

  if (!context) {
    throw new Error("useCustomerSession must be used within a CustomerSessionProvider");
  }

  return context;
}
