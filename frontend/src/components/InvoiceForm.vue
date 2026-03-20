<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useInvoicesStore } from "@/stores/invoices";

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

const statuses = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

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
    localError.value = "Не удалось получить номер инвойса";
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
    localError.value = "Выберите клиента";
    return false;
  }
  if (!invoiceNumber.value.trim()) {
    localError.value = "Укажите номер инвойса";
    return false;
  }
  if (!issueDate.value || !dueDate.value) {
    localError.value = "Укажите даты";
    return false;
  }
  const rows = lineItems.value.map((r) => ({
    description: String(r.description || "").trim(),
    quantity: Number(r.quantity),
    unitPrice: Number(r.unitPrice),
  }));
  if (rows.some((r) => !r.description)) {
    localError.value = "Заполните описание у каждой позиции";
    return false;
  }
  if (rows.some((r) => !Number.isFinite(r.quantity) || r.quantity < 0)) {
    localError.value = "Количество должно быть неотрицательным числом";
    return false;
  }
  if (rows.some((r) => !Number.isFinite(r.unitPrice) || r.unitPrice < 0)) {
    localError.value = "Цена должна быть неотрицательным числом";
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
    localError.value = e.message || "Не удалось создать инвойс";
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
        <label class="field__label" for="client">Клиент</label>
        <select
          id="client"
          v-model="clientId"
          class="field__input"
          required
          :disabled="loadingClients || !clients.length"
        >
          <option disabled value="">{{ loadingClients ? "Загрузка…" : "Выберите клиента" }}</option>
          <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="number">Номер</label>
        <div class="field__row">
          <input id="number" v-model="invoiceNumber" class="field__input" type="text" />
          <button type="button" class="mini-btn" @click="loadNumber">Сгенерировать</button>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="issue">Дата выставления</label>
        <input id="issue" v-model="issueDate" class="field__input" type="date" />
      </div>

      <div class="field">
        <label class="field__label" for="due">Срок оплаты</label>
        <input id="due" v-model="dueDate" class="field__input" type="date" />
      </div>

      <div class="field">
        <label class="field__label" for="currency">Валюта</label>
        <input id="currency" v-model="currency" class="field__input" maxlength="8" />
      </div>

      <div class="field">
        <label class="field__label" for="tax">Налог, %</label>
        <input id="tax" v-model.number="taxRate" class="field__input" type="number" min="0" step="0.01" />
      </div>

      <div class="field field--wide">
        <label class="field__label" for="status">Статус</label>
        <select id="status" v-model="status" class="field__input">
          <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>

      <div class="field field--wide">
        <label class="field__label" for="notes">Заметки</label>
        <textarea
          id="notes"
          v-model="notes"
          class="field__textarea"
          rows="3"
          placeholder="Условия, реквизиты, комментарий"
        ></textarea>
      </div>
    </div>

    <div class="lines">
      <div class="lines__head">
        <h3 class="lines__title">Позиции</h3>
        <button type="button" class="mini-btn mini-btn--ghost" @click="addLine">+ Строка</button>
      </div>

      <div class="lines__table">
        <div class="lines__row lines__row--head">
          <span>Описание</span>
          <span>Кол-во</span>
          <span>Цена</span>
          <span />
        </div>
        <div v-for="(row, idx) in lineItems" :key="idx" class="lines__row">
          <input v-model="row.description" class="field__input" type="text" placeholder="Услуга / товар" />
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
        <span>Предпросмотр без учёта округления сервера</span>
      </div>
      <div class="summary__row">
        <span>Субтотал</span>
        <strong>{{ previewSubtotal.toFixed(2) }} {{ currency }}</strong>
      </div>
      <div class="summary__row">
        <span>Налог</span>
        <strong>{{ previewTax.toFixed(2) }} {{ currency }}</strong>
      </div>
      <div class="summary__row summary__row--total">
        <span>Итого</span>
        <strong>{{ previewTotal.toFixed(2) }} {{ currency }}</strong>
      </div>
    </div>

    <p v-if="localError" class="error" role="alert">{{ localError }}</p>

    <div class="actions">
      <button class="primary" type="submit" :disabled="submitting">
        {{ submitting ? "Создание…" : "Создать инвойс" }}
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
