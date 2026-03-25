// app/(auth)/login/page.tsx
import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — Vaulit",
  description: "Sign in to your Vaulit portfolio manager",
};

export default function LoginPage() {
  return <LoginForm />;
}
