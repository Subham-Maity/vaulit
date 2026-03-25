// app/(auth)/login/_components/LoginForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash, LockKey, EnvelopeSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLogin } from "../hooks/useLogin";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: login, isPending } = useLogin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login({ email, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header brand */}
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">vaulit</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Portfolio Manager
          </p>
        </div>

        <Card className="border border-border shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription className="text-xs">
              Enter your admin credentials to continue.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} id="login-form" className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-medium">
                  Email
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <EnvelopeSimple size={15} />
                  </span>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@portfolio.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-medium">
                  Password
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <LockKey size={15} />
                  </span>
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-9 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-0">
            <Button
              type="submit"
              form="login-form"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              First time?{" "}
              <Link
                href="/create"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Create admin account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
