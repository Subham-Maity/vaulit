// app/(auth)/create/hooks/useCreateAdmin.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AxiosError } from "axios";

interface CreateAdminPayload {
  email: string;
  password: string;
}

interface CreateAdminResponse {
  message: string;
  admin: { id: string; email: string };
}

async function createAdmin(payload: CreateAdminPayload): Promise<CreateAdminResponse> {
  const setupKey = process.env.NEXT_PUBLIC_ADMIN_SETUP_KEY ?? "";
  const { data } = await api.post<CreateAdminResponse>(
    "/auth/admin/setup",
    { email: payload.email, password: payload.password },
    { headers: { "x-setup-key": setupKey } },
  );
  return data;
}

export function useCreateAdmin() {
  const router = useRouter();

  return useMutation<CreateAdminResponse, AxiosError<{ message?: string }>, CreateAdminPayload>({
    mutationFn: createAdmin,
    onSuccess: (data) => {
      toast.success(data.message || "Admin account created! You can now log in.");
      router.push("/login");
    },
    onError: (error) => {
      // Backend wraps errors: { message: { message: "...", error: "...", statusCode: N } }
      const raw = error.response?.data?.message;
      const message =
        typeof raw === "string"
          ? raw
          : typeof raw === "object" && raw !== null
            ? ((raw as { message?: string }).message ?? "Setup failed. Please check your details.")
            : (error.message ?? "Setup failed. Please check your details.");

      if (error.response?.status === 409) {
        toast.error("Admin account already exists. Please log in instead.");
        router.push("/login");
        return;
      }
      toast.error(message);
    },
  });
}
