"use client";

import Link from "next/link";
import { SignOut, User } from "@phosphor-icons/react";
import { AuthGuard } from "./(auth)/guard/AuthGuard";
import { useAuth } from "./(auth)/guard/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function DashboardHome() {
  const { data: admin } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal top bar */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-bold tracking-tight">vaulit</span>
        <div className="flex items-center gap-3">
          {admin?.email && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User size={13} />
              {admin.email}
            </span>
          )}
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <Link href="/logout">
              <SignOut size={13} />
              Sign out
            </Link>
          </Button>
        </div>
      </header>

      {/* Content area */}
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Portfolio Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You are signed in as{" "}
              <span className="font-medium text-foreground">{admin?.email}</span>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Dashboard features coming soon.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <DashboardHome />
    </AuthGuard>
  );
}
