import { defineStore } from "pinia";
import { api, TOKEN_KEY, getApiErrorMessage } from "@/api";
import { i18n } from "@/i18n";

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
        const { data } = await api.post("auth/register", payload);
        this.persistToken(data.token);
        this.user = data.user ?? null;
        await this.fetchMe();
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.auth.registerFail"));
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async login(payload) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post("auth/login", payload);
        this.persistToken(data.token);
        this.user = data.user ?? null;
        await this.fetchMe();
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.auth.loginFail"));
        this.error = msg;
        throw new Error(msg);
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
        const { data } = await api.get("auth/me");
        this.user = data.user ?? null;
        return this.user;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.auth.profileFail"));
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async updateProfile(patch) {
      if (!this.token) throw new Error(i18n.global.t("errors.notAuthorized"));
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.patch("auth/me", patch);
        this.user = data.user ?? null;
        return this.user;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.auth.updateFail"));
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.clearSession();
    },
  },
});
