<script setup>
import { ref, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import Navbar from "@/components/Navbar.vue";
import Sidebar from "@/components/Sidebar.vue";
import InvoiceForm from "@/components/InvoiceForm.vue";
import { useClientsStore } from "@/stores/clients";

const sidebarCollapsed = ref(false);
const router = useRouter();
const clientsStore = useClientsStore();

async function loadClients() {
  await clientsStore.fetchList({ limit: 500 });
}

async function onSubmitted() {
  await router.push({ name: "invoices" });
}

onMounted(() => {
  loadClients();
});
</script>

<template>
  <div class="page">
    <Sidebar v-model:collapsed="sidebarCollapsed" />
    <div class="page__main">
      <Navbar title="Новый инвойс" />
      <div class="page__content">
        <div class="head glass-panel">
          <div>
            <h1 class="title">Создание инвойса</h1>
            <p class="sub">Клиент, позиции, налоги — сервер пересчитает итоги</p>
          </div>
          <RouterLink class="ghost-link" to="/invoices">← К списку</RouterLink>
        </div>

        <div class="glass-panel form-wrap">
          <InvoiceForm
            :clients="clientsStore.items"
            :loading-clients="clientsStore.loading"
            @submitted="onSubmitted"
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
  gap: 12px;
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

.ghost-link {
  color: #c7d2fe;
  text-decoration: none;
  font-weight: 600;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.ghost-link:hover {
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.45);
}

.form-wrap {
  padding: 18px;
}
</style>
