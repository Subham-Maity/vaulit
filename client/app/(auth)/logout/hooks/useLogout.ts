// app/(auth)/logout/hooks/useLogout.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { authKeys } from "@/lib/query-keys";
import { AxiosError } from "axios";
import firebaseApp from "@/lib/firebase";

async function logoutAdmin(): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>("/auth/admin/logout");
  // Also sign out from Firebase client side (best-effort)
  try {
    const auth = getAuth(firebaseApp);
    await signOut(auth);
  } catch {
    // non-critical
  }
  return data;
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, AxiosError>({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      // Clear all cached queries so guard re-evaluates cleanly
      queryClient.clear();
      router.replace("/login");
    },
    onError: () => {
      toast.error("Logout failed. Try again.");
      // Even on error, redirect to login so the stale UI is reset
      queryClient.clear();
      router.replace("/login");
    },
  });
}
