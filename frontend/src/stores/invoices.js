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

function authHeadersJson() {
  const auth = useAuthStore();
  if (!auth.token) {
    throw new Error("Требуется авторизация");
  }
  return {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
  };
}

function authHeadersBare() {
  const auth = useAuthStore();
  if (!auth.token) {
    throw new Error("Требуется авторизация");
  }
  return {
    Authorization: `Bearer ${auth.token}`,
  };
}

export const useInvoicesStore = defineStore("invoices", {
  state: () => ({
    items: [],
    total: 0,
    loading: false,
    error: null,
    current: null,
    currentClient: null,
    nextNumberLoading: false,
  }),

  actions: {
    async fetchNextNumber(prefix = "INV") {
      this.nextNumberLoading = true;
      this.error = null;
      try {
        const q = new URLSearchParams({ prefix });
        const res = await fetch(`/api/invoices/next-number?${q}`, {
          headers: authHeadersBare(),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось получить номер");
        }
        return data.invoiceNumber;
      } catch (e) {
        this.error = e.message || "Ошибка номера инвойса";
        throw e;
      } finally {
        this.nextNumberLoading = false;
      }
    },

    async fetchList(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const q = new URLSearchParams();
        if (params.status) q.set("status", params.status);
        if (params.clientId) q.set("clientId", params.clientId);
        if (params.fromDate) q.set("fromDate", params.fromDate);
        if (params.toDate) q.set("toDate", params.toDate);
        if (params.limit != null) q.set("limit", String(params.limit));
        if (params.offset != null) q.set("offset", String(params.offset));
        if (params.sort) q.set("sort", params.sort);
        const qs = q.toString();
        const res = await fetch(`/api/invoices${qs ? `?${qs}` : ""}`, {
          headers: authHeadersBare(),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось загрузить инвойсы");
        }
        this.items = data.items ?? [];
        this.total = data.total ?? 0;
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка загрузки инвойсов";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async fetchOne(id) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          headers: authHeadersBare(),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Инвойс не найден");
        }
        this.current = data.invoice ?? null;
        this.currentClient = data.client ?? null;
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка загрузки инвойса";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async create(payload) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: authHeadersJson(),
          body: JSON.stringify(payload),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось создать инвойс");
        }
        this.current = data.invoice ?? null;
        this.currentClient = data.client ?? null;
        if (this.current) {
          this.items = [this.current, ...this.items];
          this.total = (this.total || 0) + 1;
        }
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка создания инвойса";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async update(id, patch) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          method: "PATCH",
          headers: authHeadersJson(),
          body: JSON.stringify(patch),
        });
        const data = await parseJsonResponse(res);
        if (res.status === 401) {
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (!res.ok) {
          throw new Error(data.message || "Не удалось обновить инвойс");
        }
        this.current = data.invoice ?? null;
        this.currentClient = data.client ?? null;
        if (this.current) {
          const idx = this.items.findIndex((inv) => inv.id === this.current.id);
          if (idx !== -1) this.items[idx] = this.current;
        }
        return data;
      } catch (e) {
        this.error = e.message || "Ошибка обновления инвойса";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async remove(id) {
      this.loading = true;
      this.error = null;
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          method: "DELETE",
          headers: authHeadersBare(),
        });
        if (res.status === 401) {
          const data = await parseJsonResponse(res);
          useAuthStore().clearSession();
          throw new Error(data.message || "Сессия истекла");
        }
        if (res.status === 204) {
          this.items = this.items.filter((inv) => inv.id !== id);
          this.total = Math.max(0, (this.total || 1) - 1);
          if (this.current?.id === id) {
            this.current = null;
            this.currentClient = null;
          }
          return true;
        }
        const data = await parseJsonResponse(res);
        throw new Error(data.message || "Не удалось удалить инвойс");
      } catch (e) {
        this.error = e.message || "Ошибка удаления инвойса";
        throw e;
      } finally {
        this.loading = false;
      }
    },

    clearCurrent() {
      this.current = null;
      this.currentClient = null;
    },
  },
});
