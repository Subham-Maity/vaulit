// app/(auth)/guard/AuthGuard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard
 *
 * Wraps protected pages. Checks the session via GET /auth/admin/me.
 * - Loading: shows a centered spinner
 * - Error / 401: redirects to /login
 * - Success: renders children
 *
 * Usage in a layout:
 *   <AuthGuard>{children}</AuthGuard>
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { data, isLoading, isError } = useAuth();

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Verifying session…
          </p>
        </div>
      </div>
    );
  }

  if (isError || !data) return null;

  return <>{children}</>;
}
