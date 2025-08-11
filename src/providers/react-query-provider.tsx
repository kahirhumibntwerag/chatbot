"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // Data remains fresh for 5 minutes
            gcTime: 30 * 60 * 1000,   // Keep unused data for 30 minutes
            refetchOnWindowFocus: false, // Don't refetch on window focus
            refetchOnMount: true,     // Always refetch when component mounts
            retry: 1,
            refetchOnReconnect: true, // Refetch when reconnecting
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}