// app/(auth)/create/_components/CreateAdminForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeSlash, LockKey, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
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
import { useCreateAdmin } from "../hooks/useCreateAdmin";

export function CreateAdminForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const { mutate: createAdmin, isPending } = useCreateAdmin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (password.length < 12) {
      setPasswordError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    createAdmin({ email, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* Header brand */}
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">vaulit</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            First-Run Setup
          </p>
        </div>

        <Card className="border border-border shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-foreground" />
              <CardTitle className="text-lg">Create Admin Account</CardTitle>
            </div>
            <CardDescription className="text-xs">
              This can only be done once. The account manages your entire portfolio.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} id="create-form" className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="create-email" className="text-xs font-medium">
                  Email
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <EnvelopeSimple size={15} />
                  </span>
                  <Input
                    id="create-email"
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
                <Label htmlFor="create-password" className="text-xs font-medium">
                  Password{" "}
                  <span className="text-muted-foreground font-normal">(min 12 chars)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <LockKey size={15} />
                  </span>
                  <Input
                    id="create-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Strong password…"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="create-confirm-password" className="text-xs font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <LockKey size={15} />
                  </span>
                  <Input
                    id="create-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat password…"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-0">
            <Button
              type="submit"
              form="create-form"
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                  Creating account…
                </span>
              ) : (
                "Create Admin Account"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Already set up?{" "}
              <Link
                href="/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
