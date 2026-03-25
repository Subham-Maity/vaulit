// app/(auth)/create/page.tsx
import type { Metadata } from "next";
import { CreateAdminForm } from "./_components/CreateAdminForm";

export const metadata: Metadata = {
  title: "Setup — Vaulit",
  description: "Create the admin account for Vaulit",
};

export default function CreatePage() {
  return <CreateAdminForm />;
}
