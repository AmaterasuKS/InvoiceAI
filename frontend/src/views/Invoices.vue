<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import Navbar from "@/components/Navbar.vue";
import Sidebar from "@/components/Sidebar.vue";
import InvoiceTable from "@/components/InvoiceTable.vue";
import { useInvoicesStore } from "@/stores/invoices";
import { useClientsStore } from "@/stores/clients";

const { t } = useI18n();

const sidebarCollapsed = ref(false);
const page = ref(1);
const pageSize = 10;
const sort = ref("issue_date_desc");
const statusFilter = ref("");

const invoicesStore = useInvoicesStore();
const clientsStore = useClientsStore();

const clientNames = computed(() => {
  const map = {};
  for (const c of clientsStore.items) {
    map[c.id] = c.name;
  }
  return map;
});

async function loadInvoices() {
  await invoicesStore.fetchList({
    limit: pageSize,
    offset: (page.value - 1) * pageSize,
    sort: sort.value,
    status: statusFilter.value || undefined,
  });
}

async function loadClients() {
  await clientsStore.fetchList({ limit: 500 });
}

async function onDelete(inv) {
  try {
    await invoicesStore.remove(inv.id);
    await loadInvoices();
  } catch {
    /* store error */
  }
}

watch([sort, statusFilter], () => {
  page.value = 1;
});

watch(
  [page, sort, statusFilter],
  () => {
    loadInvoices();
  },
  { immediate: true }
);

onMounted(async () => {
  await loadClients();
});
</script>

<template>
  <div class="page">
    <Sidebar v-model:collapsed="sidebarCollapsed" />
    <div class="page__main">
      <Navbar :title="t('invoices.title')" />
      <div class="page__content">
        <div class="head glass-panel">
          <div>
            <h1 class="title">{{ t("invoices.title") }}</h1>
            <p class="sub">{{ t("invoices.sub") }}</p>
          </div>
          <div class="head__actions">
            <div class="filter">
              <label class="filter__label" for="status">{{ t("invoices.statusLabel") }}</label>
              <select id="status" v-model="statusFilter" class="filter__select">
                <option value="">{{ t("invoices.statusAll") }}</option>
                <option value="draft">{{ t("status.draft") }}</option>
                <option value="sent">{{ t("status.sent") }}</option>
                <option value="paid">{{ t("status.paid") }}</option>
                <option value="overdue">{{ t("status.overdue") }}</option>
              </select>
            </div>
            <RouterLink class="cta" to="/invoices/new">{{ t("invoices.new") }}</RouterLink>
          </div>
        </div>

        <div class="glass-panel table-wrap">
          <InvoiceTable
            :items="invoicesStore.items"
            :client-names="clientNames"
            :loading="invoicesStore.loading"
            :sort="sort"
            :page="page"
            :page-size="pageSize"
            :total="invoicesStore.total"
            @update:sort="sort = $event"
            @update:page="page = $event"
            @delete="onDelete"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  min-height: 100vh;
  background: #0a0a0f;
  color: #f8fafc;
}

.page__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.page__content {
  padding: 8px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.glass-panel {
  border-radius: 20px;
  padding: 18px 20px;
  background: linear-gradient(145deg, rgba(18, 18, 26, 0.95), rgba(12, 12, 18, 0.85));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 800;
}

.sub {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.head__actions {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.filter {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.filter__select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 18, 26, 0.9);
  color: #e2e8f0;
  font: inherit;
}

.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: 14px;
  text-decoration: none;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 16px 40px rgba(99, 102, 241, 0.35);
  transition:
    transform 0.15s ease,
    filter 0.15s ease;
}

.cta:hover {
  transform: translateY(-2px);
  filter: brightness(1.03);
}

.table-wrap {
  padding: 16px;
}
</style>
