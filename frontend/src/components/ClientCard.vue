<script setup>
import { computed } from "vue";

const props = defineProps({
  client: {
    type: Object,
    required: true,
  },
  analytics: {
    type: Object,
    default: null,
  },
  loadingAnalytics: {
    type: Boolean,
    default: false,
  },
  expanded: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle-detail", "edit", "delete"]);

const initials = computed(() => {
  const n = props.client.name || "";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase() || "CL";
});

function formatMoney(n) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}
</script>

<template>
  <article class="card">
    <div class="card__head">
      <div class="avatar" aria-hidden="true">{{ initials }}</div>
      <div class="card__titles">
        <h3 class="card__name">{{ client.name }}</h3>
        <p v-if="client.email" class="card__meta">{{ client.email }}</p>
        <p v-if="client.phone" class="card__meta">{{ client.phone }}</p>
      </div>
    </div>

    <p v-if="client.address" class="card__address">{{ client.address }}</p>

    <div class="card__chips">
      <span v-if="client.notes" class="chip chip--note" :title="client.notes">Есть заметка</span>
    </div>

    <div class="card__actions">
      <button type="button" class="btn btn--ghost" @click="emit('toggle-detail')">
        {{ expanded ? "Скрыть аналитику" : "Аналитика" }}
      </button>
      <button type="button" class="btn btn--ghost" @click="emit('edit')">Изменить</button>
      <button type="button" class="btn btn--danger" @click="emit('delete')">Удалить</button>
    </div>

    <transition name="fade-slide">
      <div v-if="expanded" class="card__detail">
        <div v-if="loadingAnalytics" class="detail__loading">Загрузка метрик…</div>
        <template v-else-if="analytics">
          <div class="detail__grid">
            <div class="metric">
              <span class="metric__label">Инвойсов</span>
              <strong class="metric__value">{{ analytics.invoiceCount }}</strong>
            </div>
            <div class="metric">
              <span class="metric__label">Оплачено</span>
              <strong class="metric__value">{{ formatMoney(analytics.paidTotal) }}</strong>
            </div>
            <div class="metric">
              <span class="metric__label">Открыто</span>
              <strong class="metric__value">{{ formatMoney(analytics.outstandingTotal) }}</strong>
            </div>
            <div class="metric">
              <span class="metric__label">Просрочка</span>
              <strong class="metric__value metric__value--danger">{{ formatMoney(analytics.overdueTotal) }}</strong>
            </div>
          </div>
          <div class="detail__statuses">
            <span class="pill">draft: {{ analytics.byStatus?.draft ?? 0 }}</span>
            <span class="pill">sent: {{ analytics.byStatus?.sent ?? 0 }}</span>
            <span class="pill">paid: {{ analytics.byStatus?.paid ?? 0 }}</span>
            <span class="pill pill--alert">overdue: {{ analytics.byStatus?.overdue ?? 0 }}</span>
          </div>
        </template>
        <p v-else class="detail__empty">Нет данных аналитики</p>
      </div>
    </transition>
  </article>
</template>

<style scoped>
.card {
  border-radius: 20px;
  padding: 18px;
  background: linear-gradient(150deg, rgba(18, 18, 26, 0.95), rgba(12, 12, 18, 0.85));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.1),
    0 22px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.card:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.35);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.35),
    0 28px 70px rgba(99, 102, 241, 0.18);
}

.card__head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.45);
}

.card__titles {
  min-width: 0;
}

.card__name {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__meta {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__address {
  margin: 0;
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
}

.card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}

.chip--note {
  border-color: rgba(129, 140, 248, 0.45);
  color: #c7d2fe;
}

.card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  border-radius: 12px;
  padding: 10px 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.btn:hover {
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 10px 26px rgba(99, 102, 241, 0.18);
}

.btn--danger {
  border-color: rgba(248, 113, 113, 0.45);
  color: #fecdd3;
  background: rgba(248, 113, 113, 0.08);
}

.btn--danger:hover {
  box-shadow: 0 10px 26px rgba(248, 113, 113, 0.2);
}

.card__detail {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.detail__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.metric__label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin-bottom: 4px;
}

.metric__value {
  font-size: 16px;
  color: #e2e8f0;
}

.metric__value--danger {
  color: #fecdd3;
}

.detail__statuses {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.pill {
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
}

.pill--alert {
  border-color: rgba(244, 63, 94, 0.45);
  color: #fecdd3;
  animation: pulse-pill 2.2s ease-in-out infinite;
}

@keyframes pulse-pill {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.35);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(244, 63, 94, 0);
  }
}

.detail__loading,
.detail__empty {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
