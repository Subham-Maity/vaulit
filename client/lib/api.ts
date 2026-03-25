// lib/api.ts
import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // always send the httpOnly session cookie
  headers: { "Content-Type": "application/json" },
});

// Redirect to /login on any 401 (except when already on auth pages).
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/create")
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
