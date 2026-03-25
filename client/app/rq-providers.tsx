// app/providers.tsx
"use client";
import { useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 min — data stays fresh
        retry: 1, // only retry once on failure
        refetchOnWindowFocus: false, // recommended for external API backends
      },
    },
  });
}

export default function RQProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = makeQueryClient();
  }

  return (
    <QueryClientProvider client={clientRef.current}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
