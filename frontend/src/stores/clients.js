import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { api, getApiErrorMessage } from "@/api";

function ensureAuth() {
  const auth = useAuthStore();
  if (!auth.token) {
    throw new Error("Требуется авторизация");
  }
}

export const useClientsStore = defineStore("clients", {
  state: () => ({
    items: [],
    total: 0,
    loading: false,
    error: null,
    current: null,
    currentAnalytics: null,
  }),

  actions: {
    async fetchList(params = {}) {
      ensureAuth();
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get("clients", { params });
        this.items = data.items ?? [];
        this.total = data.total ?? 0;
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, "Не удалось загрузить клиентов");
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async fetchOne(id) {
      ensureAuth();
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get(`clients/${id}`);
        this.current = data.client ?? null;
        this.currentAnalytics = data.analytics ?? null;
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, "Клиент не найден");
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async create(payload) {
      ensureAuth();
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post("clients", payload);
        const client = data.client;
        if (client) {
          this.items = [client, ...this.items];
          this.total = (this.total || 0) + 1;
        }
        return client;
      } catch (e) {
        const msg = getApiErrorMessage(e, "Не удалось создать клиента");
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async update(id, patch) {
      ensureAuth();
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.patch(`clients/${id}`, patch);
        const client = data.client;
        if (client) {
          const idx = this.items.findIndex((c) => c.id === client.id);
          if (idx !== -1) this.items[idx] = client;
          if (this.current?.id === client.id) this.current = client;
        }
        return client;
      } catch (e) {
        const msg = getApiErrorMessage(e, "Не удалось обновить клиента");
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async remove(id) {
      ensureAuth();
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`clients/${id}`);
        this.items = this.items.filter((c) => c.id !== id);
        this.total = Math.max(0, (this.total || 1) - 1);
        if (this.current?.id === id) {
          this.current = null;
          this.currentAnalytics = null;
        }
        return true;
      } catch (e) {
        const msg = getApiErrorMessage(e, "Не удалось удалить клиента");
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    clearCurrent() {
      this.current = null;
      this.currentAnalytics = null;
    },
  },
});
