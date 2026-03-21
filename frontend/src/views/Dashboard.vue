<script setup>
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import gsap from "gsap";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
} from "chart.js";
import { Line } from "vue-chartjs";
import Navbar from "@/components/Navbar.vue";
import Sidebar from "@/components/Sidebar.vue";
import { useInvoicesStore } from "@/stores/invoices";
import { useClientsStore } from "@/stores/clients";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler
);

const invoicesStore = useInvoicesStore();
const clientsStore = useClientsStore();
const { t, locale } = useI18n();

const numberLocale = computed(() => (locale.value === "en" ? "en-US" : "ru-RU"));

const sidebarCollapsed = ref(false);
const periodMonths = ref(6);
const loading = ref(true);
const loadError = ref("");

const revenueEl = ref(null);
const openEl = ref(null);
const rateEl = ref(null);
const unpaidCountEl = ref(null);
const contentRef = ref(null);

/**
 * issue_date из API: YYYY-MM-DD или полная ISO-строка.
 * Нельзя склеивать `${date}T00:00:00`, если в date уже есть время — будет Invalid Date.
 */
function parseInvoiceIssueDate(raw) {
  if (raw == null || raw === "") return new Date(NaN);
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00`);
  }
  return new Date(s);
}

const clientNameById = computed(() => {
  const map = new Map();
  for (const c of clientsStore.items) {
    map.set(c.id, c.name);
  }
  return map;
});

const filteredInvoices = computed(() => {
  const list = invoicesStore.items;
  if (!periodMonths.value) return list;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - periodMonths.value);
  const t = cutoff.getTime();
  return list.filter((inv) => {
    const d = parseInvoiceIssueDate(inv.issueDate);
    return d.getTime() >= t;
  });
});

const paidInvoices = computed(() => filteredInvoices.value.filter((i) => i.status === "paid"));

const openInvoices = computed(() =>
  filteredInvoices.value.filter((i) => ["sent", "overdue", "draft"].includes(i.status))
);

const revenueTotal = computed(() =>
  paidInvoices.value.reduce((s, i) => s + Number(i.total || 0), 0)
);

const openTotal = computed(() =>
  openInvoices.value.reduce((s, i) => s + Number(i.total || 0), 0)
);

const paymentRate = computed(() => {
  const paid = revenueTotal.value;
  const open = openTotal.value;
  const all = paid + open;
  if (all <= 0) return 0;
  return Math.round((paid / all) * 1000) / 10;
});

const unpaidAll = computed(() =>
  filteredInvoices.value.filter((i) => i.status === "sent" || i.status === "overdue")
);

const unpaidHighlight = computed(() => {
  const list = [...unpaidAll.value].sort(
    (a, b) => parseInvoiceIssueDate(a.dueDate) - parseInvoiceIssueDate(b.dueDate)
  );
  return list.slice(0, 6);
});

const monthlySeries = computed(() => {
  const map = new Map();
  for (const inv of paidInvoices.value) {
    const key = String(inv.issueDate || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    map.set(key, (map.get(key) || 0) + Number(inv.total || 0));
  }
  const keys = [...map.keys()].sort();
  const last =
    periodMonths.value === 0 ? keys.slice(-12) : keys.slice(-Math.max(periodMonths.value, 4));
  return {
    labels: last.map((k) => {
      const [y, m] = k.split("-");
      return `${m}.${y}`;
    }),
    data: last.map((k) => Number(map.get(k).toFixed(2))),
  };
});

const chartData = computed(() => ({
  labels: monthlySeries.value.labels,
  datasets: [
    {
      label: t("dashboard.chartDataset"),
      data: monthlySeries.value.data,
      borderColor: "#6366f1",
      backgroundColor: "rgba(99, 102, 241, 0.18)",
      tension: 0.35,
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: "#8b5cf6",
      pointBorderColor: "#0a0a0f",
      pointBorderWidth: 2,
    },
  ],
}));

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 1200,
  },
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(15, 15, 22, 0.92)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      titleColor: "#e2e8f0",
      bodyColor: "#cbd5e1",
      padding: 12,
      callbacks: {
        label: (ctx) => ` ${formatMoney(ctx.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(148,163,184,0.08)" },
      ticks: { color: "#94a3b8" },
    },
    y: {
      grid: { color: "rgba(148,163,184,0.08)" },
      ticks: {
        color: "#94a3b8",
        callback: (value) => compactMoney(value),
      },
    },
  },
}));

const topClients = computed(() => {
  const totals = new Map();
  for (const inv of paidInvoices.value) {
    const id = inv.clientId;
    totals.set(id, (totals.get(id) || 0) + Number(inv.total || 0));
  }
  return [...totals.entries()]
    .map(([id, total]) => ({
      id,
      name: clientNameById.value.get(id) || t("dashboard.clientFallback"),
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
});

function formatMoney(n) {
  return new Intl.NumberFormat(numberLocale.value, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function compactMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(Math.round(v));
}

function animateNumber(el, value, formatter) {
  if (!el) return;
  const end = Number(value) || 0;
  const obj = { v: 0 };
  gsap.fromTo(
    obj,
    { v: 0 },
    {
      v: end,
      duration: 1.15,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = formatter ? formatter(obj.v) : String(Math.round(obj.v));
      },
    }
  );
}

function runPageReveal() {
  const root = contentRef.value;
  if (!root) return;
  const blocks = root.querySelectorAll(".dash-reveal");
  gsap.fromTo(
    blocks,
    { y: 36, opacity: 0, filter: "blur(8px)" },
    {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.75,
      ease: "power3.out",
      stagger: 0.1,
      clearProps: "filter",
    }
  );
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    await Promise.all([
      invoicesStore.fetchList({ limit: 500, sort: "issue_date_desc" }),
      clientsStore.fetchList({ limit: 500 }),
    ]);
  } catch (e) {
    loadError.value = e.message || t("dashboard.loadError");
  } finally {
    loading.value = false;
  }
}

watch(
  [loading, revenueTotal, openTotal, paymentRate, unpaidAll],
  async () => {
    if (loading.value) return;
    await nextTick();
    animateNumber(revenueEl.value, revenueTotal.value, formatMoney);
    animateNumber(openEl.value, openTotal.value, formatMoney);
    animateNumber(rateEl.value, paymentRate.value, (v) => `${Math.round(v * 10) / 10}%`);
    animateNumber(unpaidCountEl.value, unpaidAll.value.length, (v) => String(Math.round(v)));
  },
  { flush: "post" }
);

onMounted(async () => {
  await load();
  await nextTick();
  runPageReveal();
});
</script>

<template>
  <div class="dashboard">
    <Sidebar v-model:collapsed="sidebarCollapsed" />
    <div class="dashboard__main">
      <Navbar :title="t('dashboard.title')" :notification-count="0" />
      <div ref="contentRef" class="dashboard__content">
        <div class="dashboard__toolbar dash-reveal">
          <div>
            <h2 class="dashboard__h2">{{ t("dashboard.heading") }}</h2>
            <p class="dashboard__sub">{{ t("dashboard.sub") }}</p>
          </div>
          <div class="dashboard__period">
            <label class="dashboard__period-label" for="period">{{ t("dashboard.period") }}</label>
            <select id="period" v-model.number="periodMonths" class="dashboard__select">
              <option :value="3">{{ t("dashboard.period3") }}</option>
              <option :value="6">{{ t("dashboard.period6") }}</option>
              <option :value="12">{{ t("dashboard.period12") }}</option>
              <option :value="0">{{ t("dashboard.periodAll") }}</option>
            </select>
          </div>
        </div>

        <p v-if="loadError" class="dashboard__banner dash-reveal" role="alert">{{ loadError }}</p>

        <div v-if="loading" class="dashboard__skeleton-grid dash-reveal">
          <div v-for="n in 4" :key="n" class="skeleton skeleton--card" />
          <div class="skeleton skeleton--wide" />
        </div>

        <template v-else>
          <div class="dashboard__stats">
            <article class="glass-card dash-reveal">
              <div class="glass-card__icon glass-card__icon--indigo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5"
                  />
                </svg>
              </div>
              <p class="glass-card__label">{{ t("dashboard.revenue") }}</p>
              <p ref="revenueEl" class="glass-card__value">$0</p>
              <p class="glass-card__hint">{{ t("dashboard.revenueHint") }}</p>
            </article>

            <article class="glass-card dash-reveal">
              <div class="glass-card__icon glass-card__icon--purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M4 7h16M4 12h10M4 17h16"
                  />
                </svg>
              </div>
              <p class="glass-card__label">{{ t("dashboard.toPay") }}</p>
              <p ref="openEl" class="glass-card__value">$0</p>
              <p class="glass-card__hint">{{ t("dashboard.toPayHint") }}</p>
            </article>

            <article class="glass-card dash-reveal">
              <div class="glass-card__icon glass-card__icon--teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 12l4 4L19 6"
                  />
                </svg>
              </div>
              <p class="glass-card__label">{{ t("dashboard.payRate") }}</p>
              <p ref="rateEl" class="glass-card__value">0%</p>
              <p class="glass-card__hint">{{ t("dashboard.payRateHint") }}</p>
            </article>

            <article class="glass-card dash-reveal">
              <div class="glass-card__icon glass-card__icon--rose">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9v4m0 4h.01M5 19h14a2 2 0 0 0 2-2V7l-8-4-8 4v10a2 2 0 0 0 2 2z"
                  />
                </svg>
              </div>
              <p class="glass-card__label">{{ t("dashboard.focusPay") }}</p>
              <p ref="unpaidCountEl" class="glass-card__value">0</p>
              <p class="glass-card__hint">{{ t("dashboard.focusPayHint") }}</p>
            </article>
          </div>

          <section class="glass-panel dash-reveal">
            <div class="glass-panel__head">
              <div>
                <h3 class="glass-panel__title">{{ t("dashboard.chartTitle") }}</h3>
                <p class="glass-panel__sub">{{ t("dashboard.chartSub") }}</p>
              </div>
            </div>
            <div class="chart-wrap">
              <Line v-if="monthlySeries.labels.length" :data="chartData" :options="chartOptions" />
              <p v-else class="empty-hint">{{ t("dashboard.chartEmpty") }}</p>
            </div>
          </section>

          <div class="dashboard__split">
            <section class="glass-panel dash-reveal">
              <div class="glass-panel__head">
                <h3 class="glass-panel__title">{{ t("dashboard.topClients") }}</h3>
                <p class="glass-panel__sub">{{ t("dashboard.topClientsSub") }}</p>
              </div>
              <ul class="list">
                <li v-for="(row, idx) in topClients" :key="row.id" class="list__row">
                  <span class="list__rank">#{{ idx + 1 }}</span>
                  <span class="list__name">{{ row.name }}</span>
                  <span class="list__amount">{{ formatMoney(row.total) }}</span>
                </li>
                <li v-if="!topClients.length" class="empty-hint">{{ t("dashboard.topClientsEmpty") }}</li>
              </ul>
            </section>

            <section class="glass-panel dash-reveal">
              <div class="glass-panel__head">
                <h3 class="glass-panel__title">{{ t("dashboard.unpaid") }}</h3>
                <p class="glass-panel__sub">{{ t("dashboard.unpaidSub") }}</p>
              </div>
              <ul class="list">
                <li v-for="inv in unpaidHighlight" :key="inv.id" class="list__row list__row--invoice">
                  <span class="badge" :class="`badge--${inv.status}`">{{ t(`status.${inv.status}`) }}</span>
                  <span class="list__name">{{ clientNameById.get(inv.clientId) || t("dashboard.clientFallback") }}</span>
                  <span class="list__muted">{{ inv.dueDate }}</span>
                  <span class="list__amount">{{ formatMoney(inv.total) }}</span>
                </li>
                <li v-if="!unpaidHighlight.length" class="empty-hint">{{ t("dashboard.unpaidEmpty") }}</li>
              </ul>
            </section>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  min-height: 100vh;
  background: #0a0a0f;
  color: #f8fafc;
}

.dashboard__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.dashboard__content {
  padding: 8px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard__toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.dashboard__h2 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.dashboard__sub {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.dashboard__period {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dashboard__period-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.dashboard__select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 18, 26, 0.9);
  color: #e2e8f0;
  font: inherit;
}

.dashboard__banner {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(251, 191, 36, 0.35);
  background: rgba(251, 191, 36, 0.08);
  color: #fcd34d;
}

.dashboard__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.glass-card {
  position: relative;
  padding: 18px;
  border-radius: 18px;
  background: linear-gradient(150deg, rgba(18, 18, 26, 0.95), rgba(12, 12, 18, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.1),
    0 20px 50px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  overflow: hidden;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.glass-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.35),
    0 26px 70px rgba(99, 102, 241, 0.18);
}

.glass-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  color: #fff;
}

.glass-card__icon svg {
  width: 22px;
  height: 22px;
}

.glass-card__icon--indigo {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.45);
}

.glass-card__icon--purple {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 12px 30px rgba(139, 92, 246, 0.45);
}

.glass-card__icon--teal {
  background: linear-gradient(135deg, #14b8a6, #0d9488);
  box-shadow: 0 12px 30px rgba(20, 184, 166, 0.35);
}

.glass-card__icon--rose {
  background: linear-gradient(135deg, #fb7185, #f43f5e);
  box-shadow: 0 12px 30px rgba(244, 63, 94, 0.35);
}

.glass-card__label {
  margin: 0 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.glass-card__value {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.glass-card__hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #64748b;
}

.glass-panel {
  border-radius: 20px;
  padding: 20px;
  background: linear-gradient(145deg, rgba(18, 18, 26, 0.95), rgba(12, 12, 18, 0.85));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.glass-panel__head {
  margin-bottom: 12px;
}

.glass-panel__title {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
}

.glass-panel__sub {
  margin: 0;
  color: #94a3b8;
  font-size: 13px;
}

.chart-wrap {
  height: 320px;
}

.dashboard__split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

.list__row--invoice {
  grid-template-columns: auto 1fr auto auto;
}

.list__rank {
  font-weight: 800;
  color: #c7d2fe;
}

.list__name {
  font-weight: 600;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list__amount {
  font-weight: 700;
  color: #a5b4fc;
}

.list__muted {
  font-size: 12px;
  color: #94a3b8;
}

.badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 6px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.badge--sent {
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.35);
}

.badge--overdue {
  color: #fecdd3;
  border-color: rgba(244, 63, 94, 0.45);
  animation: pulse-badge 2s ease-in-out infinite;
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

.empty-hint {
  margin: 0;
  padding: 12px;
  color: #94a3b8;
  font-size: 14px;
}

.dashboard__skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.skeleton {
  border-radius: 18px;
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

.skeleton--card {
  height: 140px;
}

.skeleton--wide {
  grid-column: 1 / -1;
  height: 320px;
  border-radius: 20px;
}

@keyframes shine {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
