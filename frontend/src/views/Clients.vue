<script setup>
import { ref, watch, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import gsap from "gsap";
import Navbar from "@/components/Navbar.vue";
import Sidebar from "@/components/Sidebar.vue";
import ClientCard from "@/components/ClientCard.vue";
import { useClientsStore } from "@/stores/clients";

const { t } = useI18n();

const sidebarCollapsed = ref(false);
const search = ref("");
const searchDebounced = ref("");
const clientsStore = useClientsStore();

const expandedId = ref(null);
const analyticsById = ref({});
const loadingAnalyticsId = ref(null);

const modalOpen = ref(false);
const modalMode = ref("create");
const editingId = ref(null);
const form = ref({
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
});
const formError = ref("");
const saving = ref(false);
const gridRef = ref(null);

let searchTimer = null;

watch(search, (v) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchDebounced.value = v;
  }, 320);
});

watch(searchDebounced, () => {
  loadClients();
});

async function loadClients() {
  await clientsStore.fetchList({
    search: searchDebounced.value || undefined,
    limit: 100,
  });
  await nextTick();
  animateGrid();
}

function animateGrid() {
  const root = gridRef.value;
  if (!root) return;
  const els = root.querySelectorAll(".client-card-hook");
  if (!els.length) return;
  gsap.fromTo(
    els,
    { y: 28, opacity: 0, filter: "blur(8px)" },
    {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.65,
      ease: "power3.out",
      stagger: 0.08,
      clearProps: "filter",
    }
  );
}

async function toggleDetail(client) {
  if (expandedId.value === client.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = client.id;
  if (analyticsById.value[client.id]) return;
  loadingAnalyticsId.value = client.id;
  try {
    const data = await clientsStore.fetchOne(client.id);
    analyticsById.value = {
      ...analyticsById.value,
      [client.id]: data.analytics,
    };
  } catch {
    analyticsById.value = { ...analyticsById.value, [client.id]: null };
  } finally {
    loadingAnalyticsId.value = null;
  }
}

function openCreate() {
  modalMode.value = "create";
  editingId.value = null;
  form.value = { name: "", email: "", phone: "", address: "", notes: "" };
  formError.value = "";
  modalOpen.value = true;
}

function openEdit(client) {
  modalMode.value = "edit";
  editingId.value = client.id;
  form.value = {
    name: client.name || "",
    email: client.email || "",
    phone: client.phone || "",
    address: client.address || "",
    notes: client.notes || "",
  };
  formError.value = "";
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

async function saveClient() {
  formError.value = "";
  if (!form.value.name.trim()) {
    formError.value = t("clients.errors.name");
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: form.value.name.trim(),
      email: form.value.email.trim() || null,
      phone: form.value.phone.trim() || null,
      address: form.value.address.trim() || null,
      notes: form.value.notes.trim() || null,
    };
    if (modalMode.value === "create") {
      await clientsStore.create(payload);
    } else if (editingId.value) {
      await clientsStore.update(editingId.value, payload);
    }
    closeModal();
    await loadClients();
  } catch (e) {
    formError.value = e.message || t("clients.errors.save");
  } finally {
    saving.value = false;
  }
}

async function removeClient(client) {
  if (!window.confirm(t("clients.deleteConfirm", { name: client.name }))) return;
  try {
    await clientsStore.remove(client.id);
    if (expandedId.value === client.id) expandedId.value = null;
    const next = { ...analyticsById.value };
    delete next[client.id];
    analyticsById.value = next;
    await loadClients();
  } catch (e) {
    alert(e.message || t("clients.deleteError"));
  }
}

onMounted(() => {
  loadClients();
});
</script>

<template>
  <div class="page">
    <Sidebar v-model:collapsed="sidebarCollapsed" />
    <div class="page__main">
      <Navbar :title="t('clients.title')" />
      <div class="page__content">
        <div class="head glass-panel">
          <div>
            <h1 class="title">{{ t("clients.heading") }}</h1>
            <p class="sub">{{ t("clients.sub") }}</p>
          </div>
          <button type="button" class="cta" @click="openCreate">{{ t("clients.new") }}</button>
        </div>

        <div class="toolbar glass-panel">
          <label class="sr-only" for="search">{{ t("clients.search") }}</label>
          <input
            id="search"
            v-model="search"
            class="search"
            type="search"
            :placeholder="t('clients.searchPlaceholder')"
            autocomplete="off"
          />
        </div>

        <div v-if="clientsStore.loading && !clientsStore.items.length" class="skeleton-grid">
          <div v-for="n in 6" :key="n" class="skeleton" />
        </div>

        <div v-else ref="gridRef" class="clients-grid">
          <div v-for="c in clientsStore.items" :key="c.id" class="client-card-hook">
            <ClientCard
              :client="c"
              :expanded="expandedId === c.id"
              :analytics="analyticsById[c.id] ?? null"
              :loading-analytics="loadingAnalyticsId === c.id"
              @toggle-detail="toggleDetail(c)"
              @edit="openEdit(c)"
              @delete="removeClient(c)"
            />
          </div>
        </div>

        <p v-if="!clientsStore.loading && !clientsStore.items.length" class="empty">{{ t("clients.empty") }}</p>
      </div>
    </div>

    <teleport to="body">
      <transition name="modal-fade">
        <div v-if="modalOpen" class="modal" role="dialog" aria-modal="true">
          <div class="modal__backdrop" @click="closeModal" />
          <div class="modal__panel glass-panel">
            <div class="modal__head">
              <h2 class="modal__title">{{ modalMode === "create" ? t("clients.modalCreate") : t("clients.modalEdit") }}</h2>
              <button type="button" class="modal__close" :aria-label="t('toast.close')" @click="closeModal">×</button>
            </div>
            <div class="modal__body">
              <div class="field">
                <label class="field__label" for="c-name">{{ t("clients.fieldName") }}</label>
                <input id="c-name" v-model="form.name" class="field__input" type="text" />
              </div>
              <div class="field">
                <label class="field__label" for="c-email">{{ t("clients.fieldEmail") }}</label>
                <input id="c-email" v-model="form.email" class="field__input" type="email" />
              </div>
              <div class="field">
                <label class="field__label" for="c-phone">{{ t("clients.fieldPhone") }}</label>
                <input id="c-phone" v-model="form.phone" class="field__input" type="text" />
              </div>
              <div class="field">
                <label class="field__label" for="c-address">{{ t("clients.fieldAddress") }}</label>
                <textarea id="c-address" v-model="form.address" class="field__textarea" rows="2"></textarea>
              </div>
              <div class="field">
                <label class="field__label" for="c-notes">{{ t("clients.fieldNotes") }}</label>
                <textarea id="c-notes" v-model="form.notes" class="field__textarea" rows="3"></textarea>
              </div>
              <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
            </div>
            <div class="modal__foot">
              <button type="button" class="btn ghost" @click="closeModal">{{ t("clients.cancel") }}</button>
              <button type="button" class="btn primary" :disabled="saving" @click="saveClient">
                {{ saving ? t("clients.saving") : t("clients.save") }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
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

.cta {
  border: none;
  border-radius: 14px;
  padding: 12px 16px;
  font: inherit;
  font-weight: 800;
  color: #fff;
  cursor: pointer;
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

.toolbar {
  padding: 14px 16px;
}

.search {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 15, 0.65);
  color: #e2e8f0;
  font: inherit;
  outline: none;
}

.search:focus {
  border-color: rgba(99, 102, 241, 0.55);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.skeleton {
  height: 220px;
  border-radius: 20px;
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.04) 8%,
    rgba(255, 255, 255, 0.08) 18%,
    rgba(255, 255, 255, 0.04) 33%
  );
  background-size: 200% 100%;
  animation: shine 1.4s ease-in-out infinite;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

@keyframes shine {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.empty {
  margin: 0;
  text-align: center;
  color: #94a3b8;
  padding: 24px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
}

.modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
}

.modal__panel {
  position: relative;
  width: min(520px, 100%);
  max-height: min(90vh, 720px);
  overflow: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal__title {
  margin: 0;
  font-size: 18px;
}

.modal__close {
  border: none;
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  font-size: 22px;
  cursor: pointer;
}

.modal__body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal__foot {
  padding: 14px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.field__input,
.field__textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 15, 0.65);
  color: #e2e8f0;
  font: inherit;
}

.form-error {
  margin: 0;
  color: #fecdd3;
  font-size: 14px;
}

.btn {
  border-radius: 12px;
  padding: 10px 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn.ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.btn.primary {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.35);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
