import axios from "axios";
import { i18n } from "@/i18n";

/** Совпадает с ключом в Pinia auth — токен для interceptors */
export const TOKEN_KEY = "invoiceai_token";

const baseURL =
  import.meta.env.VITE_API_BASE_URL != null && import.meta.env.VITE_API_BASE_URL !== ""
    ? import.meta.env.VITE_API_BASE_URL
    : "/api";

export const api = axios.create({
  baseURL,
  timeout: 45_000,
  headers: {
    "Content-Type": "application/json",
  },
  validateStatus: (status) => status >= 200 && status < 300,
});

api.interceptors.request.use((config) => {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401) {
      const hadToken =
        typeof localStorage !== "undefined" && Boolean(localStorage.getItem(TOKEN_KEY));
      if (hadToken) {
        const { useAuthStore } = await import("@/stores/auth");
        useAuthStore().clearSession();
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Текст ошибки из ответа API или сеть/таймаут.
 * `fallback` — уже переведённая строка (например из i18n.global.t).
 */
export function getApiErrorMessage(error, fallback) {
  const t = i18n.global.t;
  const fb = fallback ?? t("errors.generic");
  const data = error.response?.data;
  if (data && typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  if (error.code === "ECONNABORTED") {
    return t("errors.timeout");
  }
  if (error.message === "Network Error" || !error.response) {
    return t("errors.network");
  }
  return fb;
}
