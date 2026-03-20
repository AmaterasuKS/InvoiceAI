import { defineStore } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { api, getApiErrorMessage } from "@/api";
import { i18n } from "@/i18n";

function ensureAuth() {
  const auth = useAuthStore();
  if (!auth.token) {
    throw new Error(i18n.global.t("errors.authRequired"));
  }
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
      ensureAuth();
      this.nextNumberLoading = true;
      this.error = null;
      try {
        const { data } = await api.get("invoices/next-number", { params: { prefix } });
        return data.invoiceNumber;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.invoices.numberFail"));
        this.error = msg;
        throw new Error(msg);
      } finally {
        this.nextNumberLoading = false;
      }
    },

    async fetchList(params = {}) {
      ensureAuth();
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get("invoices", { params });
        this.items = data.items ?? [];
        this.total = data.total ?? 0;
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.invoices.listFail"));
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
        const { data } = await api.get(`invoices/${id}`);
        this.current = data.invoice ?? null;
        this.currentClient = data.client ?? null;
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.invoices.notFound"));
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
        const { data } = await api.post("invoices", payload);
        this.current = data.invoice ?? null;
        this.currentClient = data.client ?? null;
        if (this.current) {
          this.items = [this.current, ...this.items];
          this.total = (this.total || 0) + 1;
        }
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.invoices.createFail"));
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
        const { data } = await api.patch(`invoices/${id}`, patch);
        this.current = data.invoice ?? null;
        this.currentClient = data.client ?? null;
        if (this.current) {
          const idx = this.items.findIndex((inv) => inv.id === this.current.id);
          if (idx !== -1) this.items[idx] = this.current;
        }
        return data;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.invoices.updateFail"));
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
        await api.delete(`invoices/${id}`);
        this.items = this.items.filter((inv) => inv.id !== id);
        this.total = Math.max(0, (this.total || 1) - 1);
        if (this.current?.id === id) {
          this.current = null;
          this.currentClient = null;
        }
        return true;
      } catch (e) {
        const msg = getApiErrorMessage(e, i18n.global.t("store.invoices.deleteFail"));
        this.error = msg;
        throw new Error(msg);
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
