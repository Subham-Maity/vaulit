// app/(auth)/logout/page.tsx
"use client";

import { useEffect } from "react";
import { useLogout } from "./hooks/useLogout";

/**
 * LogoutPage
 *
 * Auto-triggers the logout mutation on mount.
 * Shows a minimal "Logging out…" message while the request is in flight.
 * The mutation redirects to /login on completion (success or error).
 */
export default function LogoutPage() {
  const { mutate: logout, isPending } = useLogout();

  useEffect(() => {
    logout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          {isPending ? "Logging out…" : "Redirecting…"}
        </p>
      </div>
    </div>
  );
}
