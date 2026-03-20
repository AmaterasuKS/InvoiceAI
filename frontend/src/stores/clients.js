import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function authHeaders() {
  const auth = useAuthStore();
  if (!auth.token) {
    throw new Error("Требуется авторизация");
  }
  return {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
  };
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
      this.loading = true;
      this.error = null;
      try {
        const q = new URLSearchParams();
        if (params.search) q.set("search", params.search);
        if (params.limit != null) q.set("limit", String(params.limit));
        if (params.offset != null) q.set("offset", String(params.offset));
        const qs = q.toString();
        const res = await fetch(`/api/clients${qs ? `?${qs}` : ""}`, {
          headers: authHeaders(),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось загрузить клиентов");
        }
        this.items = data.items ?? [];
        this.total = data.total ?? 0;
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка загрузки клиентов";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async fetchOne(id) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`/api/clients/${id}`, {
          headers: authHeaders(),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Клиент не найден");
        }
        this.current = data.client ?? null;
        this.currentAnalytics = data.analytics ?? null;
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка загрузки клиента";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async create(payload) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось создать клиента");
        }
        const client = data.client;
        if (client) {
          this.items = [client, ...this.items];
          this.total = (this.total || 0) + 1;
        }
        return client;
      } catch (e) {
        this.error = e.message || "Ошибка создания клиента";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async update(id, patch) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`/api/clients/${id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(patch),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось обновить клиента");
        }
        const client = data.client;
        if (client) {
          const idx = this.items.findIndex((c) => c.id === client.id);
          if (idx !== -1) this.items[idx] = client;
          if (this.current?.id === client.id) this.current = client;
        }
        return client;
      } catch (e) {
        this.error = e.message || "Ошибка обновления клиента";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async remove(id) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`/api/clients/${id}`, {
          method: "DELETE",
          headers: { Authorization: authHeaders().Authorization },
        });
        if (res.status === 401) {
          const data = await parseJsonResponse(res);
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (res.status === 204) {
          this.items = this.items.filter((c) => c.id !== id);
          this.total = Math.max(0, (this.total || 1) - 1);
          if (this.current?.id === id) {
            this.current = null;
            this.currentAnalytics = null;
          }
          return true;
        }
        const data = await parseJsonResponse(res);
        throw new Error(data.message || "Не удалось удалить клиента");
      } catch (e) {
        this.error = e.message || "Ошибка удаления клиента";
        throw e;
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
