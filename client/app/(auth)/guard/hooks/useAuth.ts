// app/(auth)/guard/hooks/useAuth.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authKeys } from "@/lib/query-keys";
import { AxiosError } from "axios";

export interface AdminMe {
  id: string;
  email: string;
}

async function fetchMe(): Promise<AdminMe> {
  const { data } = await api.get<AdminMe>("/auth/admin/me");
  return data;
}

/**
 * useAuth
 *
 * Queries GET /auth/admin/me to check if the session cookie is valid.
 * Used by AuthGuard to protect routes.
 *
 * - retry: false — a 401 should not be retried; redirect immediately.
 * - staleTime: 60s — avoids hammering /me on every navigation.
 */
export function useAuth() {
  return useQuery<AdminMe, AxiosError>({
    queryKey: authKeys.me(),
    queryFn: fetchMe,
    retry: false,
    staleTime: 1000 * 60,  // 1 min
  });
}
