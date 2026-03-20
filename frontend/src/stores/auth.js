import { defineStore } from "pinia";

const TOKEN_KEY = "invoiceai_token";

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,
    user: null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    authHeader: (state) =>
      state.token ? { Authorization: `Bearer ${state.token}` } : {},
  },

  actions: {
    hydrateFromStorage() {
      if (this.token) return;
      const saved = localStorage.getItem(TOKEN_KEY);
      if (saved) {
        this.token = saved;
      }
    },

    persistToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    },

    clearSession() {
      this.user = null;
      this.error = null;
      this.persistToken(null);
    },

    async register(payload) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          throw new Error(data.message || "Не удалось зарегистрироваться");
        }
        this.persistToken(data.token);
        this.user = data.user ?? null;
        await this.fetchMe();
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка регистрации";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async login(payload) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          throw new Error(data.message || "Неверный email или пароль");
        }
        this.persistToken(data.token);
        this.user = data.user ?? null;
        await this.fetchMe();
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка входа";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async fetchMe() {
      if (!this.token) {
        this.user = null;
        return null;
      }
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            ...this.authHeader,
          },
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          this.clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось загрузить профиль");
        }
        this.user = data.user ?? null;
        return this.user;
      } catch (e) {
        this.error = e.message || "Ошибка профиля";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async updateProfile(patch) {
      if (!this.token) throw new Error("Не авторизован");
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...this.authHeader,
          },
          body: JSON.stringify(patch),
        });
        const data = await parseJsonResponse(res);
        if (!res.ok) {
          throw new Error(data.message || "Не удалось обновить профиль");
        }
        this.user = data.user ?? null;
        return this.user;
      } catch (e) {
        this.error = e.message || "Ошибка обновления профиля";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.clearSession();
    },
  },
});
