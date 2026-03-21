<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useInvoicesStore } from "@/stores/invoices";
import CurrencyCombobox from "@/components/CurrencyCombobox.vue";

const { t } = useI18n();

const props = defineProps({
  clients: {
    type: Array,
    default: () => [],
  },
  loadingClients: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["submitted"]);

const invoicesStore = useInvoicesStore();

const invoiceNumber = ref("");
const clientId = ref("");
const issueDate = ref("");
const dueDate = ref("");
const currency = ref("USD");
const taxRate = ref(0);
const status = ref("draft");
const notes = ref("");
const lineItems = ref([{ description: "", quantity: 1, unitPrice: 0 }]);
const localError = ref("");
const submitting = ref(false);

const statuses = computed(() => [
  { value: "draft", label: t("status.draft") },
  { value: "sent", label: t("status.sent") },
  { value: "paid", label: t("status.paid") },
  { value: "overdue", label: t("status.overdue") },
]);

const previewSubtotal = computed(() =>
  lineItems.value.reduce((s, row) => s + Number(row.quantity || 0) * Number(row.unitPrice || 0), 0)
);

const previewTax = computed(() => (previewSubtotal.value * Number(taxRate.value || 0)) / 100);

const previewTotal = computed(() => previewSubtotal.value + previewTax.value);

function todayISO() {
  const d = new Date();
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

async function loadNumber() {
  try {
    invoiceNumber.value = await invoicesStore.fetchNextNumber("INV");
  } catch {
    localError.value = t("invoiceForm.errors.numberFetch");
  }
}

function addLine() {
  lineItems.value.push({ description: "", quantity: 1, unitPrice: 0 });
}

function removeLine(idx) {
  if (lineItems.value.length <= 1) return;
  lineItems.value.splice(idx, 1);
}

function validate() {
  if (!clientId.value) {
    localError.value = t("invoiceForm.errors.client");
    return false;
  }
  if (!invoiceNumber.value.trim()) {
    localError.value = t("invoiceForm.errors.invoiceNumber");
    return false;
  }
  if (!issueDate.value || !dueDate.value) {
    localError.value = t("invoiceForm.errors.dates");
    return false;
  }
  const rows = lineItems.value.map((r) => ({
    description: String(r.description || "").trim(),
    quantity: Number(r.quantity),
    unitPrice: Number(r.unitPrice),
  }));
  if (rows.some((r) => !r.description)) {
    localError.value = t("invoiceForm.errors.lineDesc");
    return false;
  }
  if (rows.some((r) => !Number.isFinite(r.quantity) || r.quantity < 0)) {
    localError.value = t("invoiceForm.errors.qty");
    return false;
  }
  if (rows.some((r) => !Number.isFinite(r.unitPrice) || r.unitPrice < 0)) {
    localError.value = t("invoiceForm.errors.price");
    return false;
  }
  return true;
}

async function submit() {
  localError.value = "";
  if (!validate()) return;
  submitting.value = true;
  try {
    const payload = {
      clientId: clientId.value,
      invoiceNumber: invoiceNumber.value.trim(),
      status: status.value,
      issueDate: issueDate.value,
      dueDate: dueDate.value,
      currency: currency.value,
      taxRate: Number(taxRate.value) || 0,
      notes: notes.value.trim() || null,
      lineItems: lineItems.value.map((r) => ({
        description: String(r.description || "").trim(),
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
      })),
    };
    const data = await invoicesStore.create(payload);
    emit("submitted", data);
  } catch (e) {
    localError.value = e.message || t("invoiceForm.errors.create");
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.clients,
  (list) => {
    if (!clientId.value && list?.length === 1) {
      clientId.value = list[0].id;
    }
  },
  { immediate: true }
);

onMounted(async () => {
  issueDate.value = todayISO();
  dueDate.value = addDaysISO(14);
  await loadNumber();
});
</script>

<template>
  <form class="inv-form" @submit.prevent="submit">
    <div class="inv-form__grid">
      <div class="field">
        <label class="field__label" for="client">{{ t("invoiceForm.client") }}</label>
        <select
          id="client"
          v-model="clientId"
          class="field__input"
          required
          :disabled="loadingClients || !clients.length"
        >
          <option disabled value="">{{ loadingClients ? t("invoiceForm.loading") : t("invoiceForm.selectClient") }}</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="field field--invoice-number">
        <label class="field__label" for="number">{{ t("invoiceForm.number") }}</label>
        <div class="field__row field__row--number">
          <input
            id="number"
            v-model="invoiceNumber"
            class="field__input field__input--invoice-number"
            type="text"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="button" class="mini-btn mini-btn--compact" @click="loadNumber">
            {{ t("invoiceForm.generate") }}
          </button>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="issue">{{ t("invoiceForm.issueDate") }}</label>
        <input id="issue" v-model="issueDate" class="field__input" type="date" />
      </div>

      <div class="field">
        <label class="field__label" for="due">{{ t("invoiceForm.dueDate") }}</label>
        <input id="due" v-model="dueDate" class="field__input" type="date" />
      </div>

      <div class="field">
        <label class="field__label" for="currency">{{ t("invoiceForm.currency") }}</label>
        <CurrencyCombobox v-model="currency" />
      </div>

      <div class="field">
        <label class="field__label" for="tax">{{ t("invoiceForm.tax") }}</label>
        <input id="tax" v-model.number="taxRate" class="field__input" type="number" min="0" step="0.01" />
      </div>

      <div class="field field--wide">
        <label class="field__label" for="status">{{ t("invoiceForm.status") }}</label>
        <select id="status" v-model="status" class="field__input">
          <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <div class="field field--wide">
        <label class="field__label" for="notes">{{ t("invoiceForm.notes") }}</label>
        <textarea
          id="notes"
          v-model="notes"
          class="field__textarea"
          rows="3"
          :placeholder="t('invoiceForm.notesPlaceholder')"
        ></textarea>
      </div>
    </div>

    <div class="lines">
      <div class="lines__head">
        <h3 class="lines__title">{{ t("invoiceForm.linesTitle") }}</h3>
        <button type="button" class="mini-btn mini-btn--ghost" @click="addLine">{{ t("invoiceForm.addLine") }}</button>
      </div>

      <div class="lines__table">
        <div class="lines__row lines__row--head">
          <span>{{ t("invoiceForm.colDesc") }}</span>
          <span>{{ t("invoiceForm.colQty") }}</span>
          <span>{{ t("invoiceForm.colPrice") }}</span>
          <span />
        </div>
        <div v-for="(row, idx) in lineItems" :key="idx" class="lines__row">
          <input v-model="row.description" class="field__input" type="text" :placeholder="t('invoiceForm.linePlaceholder')" />
          <input v-model.number="row.quantity" class="field__input" type="number" min="0" step="0.01" />
          <input v-model.number="row.unitPrice" class="field__input" type="number" min="0" step="0.01" />
          <button type="button" class="icon-btn" :disabled="lineItems.length <= 1" @click="removeLine(idx)">
            ✕
          </button>
        </div>
      </div>
    </div>

    <div class="summary">
      <div class="summary__row">
        <span>{{ t("invoiceForm.previewNote") }}</span>
      </div>
      <div class="summary__row">
        <span>{{ t("invoiceForm.subtotal") }}</span>
        <strong>{{ previewSubtotal.toFixed(2) }} {{ currency }}</strong>
      </div>
      <div class="summary__row">
        <span>{{ t("invoiceForm.taxLine") }}</span>
        <strong>{{ previewTax.toFixed(2) }} {{ currency }}</strong>
      </div>
      <div class="summary__row summary__row--total">
        <span>{{ t("invoiceForm.total") }}</span>
        <strong>{{ previewTotal.toFixed(2) }} {{ currency }}</strong>
      </div>
    </div>

    <p v-if="localError" class="error" role="alert">{{ localError }}</p>

    <div class="actions">
      <button class="primary" type="submit" :disabled="submitting">
        {{ submitting ? t("invoiceForm.submitting") : t("invoiceForm.submit") }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.inv-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.inv-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field--wide {
  grid-column: 1 / -1;
}

/* Номер инвойса: больше места в сетке + минимальная ширина поля (не обрезается INV-…) */
.field--invoice-number {
  grid-column: span 2;
  min-width: 0;
}

@media (max-width: 720px) {
  .field--invoice-number {
    grid-column: span 1;
  }
}

.field__row--number {
  align-items: stretch;
}

.field__input--invoice-number {
  flex: 1 1 auto;
  min-width: min(100%, 17rem);
  font-variant-numeric: tabular-nums;
}

.field--invoice-number .mini-btn--compact {
  flex: 0 0 auto;
  padding: 10px 10px;
  font-size: 13px;
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
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 15, 0.65);
  color: #e2e8f0;
  font: inherit;
  outline: none;
  resize: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.field__input:focus,
.field__textarea:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.field__row {
  display: flex;
  gap: 8px;
}

.field__row .field__input {
  flex: 1;
}

.mini-btn {
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.45);
  background: rgba(99, 102, 241, 0.15);
  color: #e0e7ff;
  padding: 10px 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.mini-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(99, 102, 241, 0.25);
}

.mini-btn--ghost {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.lines {
  border-radius: 18px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(18, 18, 26, 0.65);
}

.lines__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.lines__title {
  margin: 0;
  font-size: 16px;
}

.lines__table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lines__row {
  display: grid;
  grid-template-columns: 2fr 0.7fr 0.9fr auto;
  gap: 8px;
  align-items: center;
}

.lines__row--head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.08);
  color: #fecdd3;
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.summary {
  border-radius: 16px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary__row {
  display: flex;
  justify-content: space-between;
  color: #cbd5e1;
  font-size: 14px;
}

.summary__row--total {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 16px;
  color: #e2e8f0;
}

.error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(244, 63, 94, 0.35);
  background: rgba(244, 63, 94, 0.1);
  color: #fecdd3;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.primary {
  border: none;
  border-radius: 14px;
  padding: 14px 18px;
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

.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.03);
}

.primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .lines__row {
    grid-template-columns: 1fr;
  }

  .lines__row--head {
    display: none;
  }
}
</style>
