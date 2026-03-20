<script setup>
import { computed } from "vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  clientNames: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  sort: {
    type: String,
    default: "issue_date_desc",
  },
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
  total: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(["update:sort", "update:page", "delete"]);

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

const sortOptions = [
  { value: "issue_date_desc", label: "Дата ↓" },
  { value: "issue_date_asc", label: "Дата ↑" },
  { value: "total_desc", label: "Сумма ↓" },
  { value: "total_asc", label: "Сумма ↑" },
  { value: "created_at_desc", label: "Создан ↓" },
];

function clientLabel(id) {
  return props.clientNames[id] || "—";
}

function formatMoney(n, currency = "USD") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function setSort(value) {
  emit("update:sort", value);
}

function setPage(p) {
  const next = Math.min(Math.max(1, p), totalPages.value);
  emit("update:page", next);
}

function onDelete(inv) {
  if (!window.confirm(`Удалить инвойс ${inv.invoiceNumber}?`)) return;
  emit("delete", inv);
}
</script>

<template>
  <div class="inv-table">
    <div class="inv-table__toolbar">
      <div class="inv-table__sort">
        <label class="inv-table__label" for="sort">Сортировка</label>
        <select id="sort" class="inv-table__select" :value="sort" @change="setSort($event.target.value)">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
      <div class="inv-table__meta">
        <span>Всего: <strong>{{ total }}</strong></span>
      </div>
    </div>

    <div class="inv-table__wrap">
      <table class="inv-table__grid">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Клиент</th>
            <th>Дата</th>
            <th>Срок</th>
            <th>Статус</th>
            <th class="inv-table__num">Сумма</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="inv-table__loading">Загрузка…</td>
          </tr>
          <tr v-else-if="!items.length">
            <td colspan="7" class="inv-table__empty">Инвойсы не найдены</td>
          </tr>
          <tr v-for="inv in items" :key="inv.id">
            <td class="inv-table__strong">{{ inv.invoiceNumber }}</td>
            <td>{{ clientLabel(inv.clientId) }}</td>
            <td>{{ inv.issueDate }}</td>
            <td>{{ inv.dueDate }}</td>
            <td>
              <span class="badge" :class="`badge--${inv.status}`">{{ inv.status }}</span>
            </td>
            <td class="inv-table__num">{{ formatMoney(inv.total, inv.currency) }}</td>
            <td class="inv-table__actions">
              <button type="button" class="ghost-btn" @click="onDelete(inv)">Удалить</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="inv-table__pager">
      <button type="button" class="pager-btn" :disabled="page <= 1" @click="setPage(page - 1)">Назад</button>
      <span class="pager-info">Стр. {{ page }} / {{ totalPages }}</span>
      <button type="button" class="pager-btn" :disabled="page >= totalPages" @click="setPage(page + 1)">
        Вперёд
      </button>
    </div>
  </div>
</template>

<style scoped>
.inv-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.inv-table__toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.inv-table__sort {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inv-table__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.inv-table__select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 18, 26, 0.9);
  color: #e2e8f0;
  font: inherit;
}

.inv-table__meta {
  color: #94a3b8;
  font-size: 14px;
}

.inv-table__wrap {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  background: rgba(18, 18, 26, 0.65);
  backdrop-filter: blur(14px);
}

.inv-table__grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

thead {
  background: rgba(255, 255, 255, 0.04);
}

th,
td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

th {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.inv-table__num {
  text-align: right;
}

.inv-table__strong {
  font-weight: 700;
  color: #e2e8f0;
}

.inv-table__loading,
.inv-table__empty {
  text-align: center;
  color: #94a3b8;
  padding: 28px !important;
}

.inv-table__actions {
  text-align: right;
}

.ghost-btn {
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.08);
  color: #fecdd3;
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.ghost-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(248, 113, 113, 0.18);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.badge--draft {
  color: #cbd5e1;
}

.badge--sent {
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.35);
}

.badge--paid {
  color: #bbf7d0;
  border-color: rgba(34, 197, 94, 0.35);
}

.badge--overdue {
  color: #fecdd3;
  border-color: rgba(244, 63, 94, 0.45);
  animation: pulse-badge 2.2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.35);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(244, 63, 94, 0);
  }
}

.inv-table__pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.pager-btn {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
  font: inherit;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}

.pager-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.45);
}

.pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pager-info {
  color: #94a3b8;
  font-size: 13px;
}
</style>
