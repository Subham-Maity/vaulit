// app/(auth)/login/hooks/useLogin.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import firebaseApp from "@/lib/firebase";
import { api } from "@/lib/api";
import { authKeys } from "@/lib/query-keys";
import { AxiosError } from "axios";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  message: string;
  admin: { id: string; email: string };
}

async function loginWithFirebase(email: string, password: string) {
  const auth = getAuth(firebaseApp);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await credential.user.getIdToken();
  return { idToken };
}

async function loginAdmin(payload: LoginPayload): Promise<LoginResponse> {
  const { idToken } = await loginWithFirebase(payload.email, payload.password);
  const { data } = await api.post<LoginResponse>("/auth/admin/login", {
    email: payload.email,
    idToken,
  });
  return data;
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error | AxiosError, LoginPayload>({
    mutationFn: loginAdmin,
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.admin.email}`);
      // Invalidate me cache so guard re-fetches the session
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      router.push("/");
    },
    onError: (error) => {
      // Firebase errors have a `.code` property
      const firebaseCode = (error as { code?: string }).code;
      if (
        firebaseCode === "auth/invalid-credential" ||
        firebaseCode === "auth/wrong-password" ||
        firebaseCode === "auth/user-not-found"
      ) {
        toast.error("Invalid email or password");
        return;
      }

      const axiosErr = error as AxiosError<{
        message?: string | { message?: string };
      }>;
      // Backend wraps errors: { message: { message: "...", error: "...", statusCode: N } }
      const raw = axiosErr.response?.data?.message;
      const message =
        typeof raw === "string"
          ? raw
          : typeof raw === "object" && raw !== null
            ? (raw.message ?? "Login failed. Please try again.")
            : (axiosErr.message ?? "Login failed. Please try again.");
      toast.error(message);
    },
  });
}
