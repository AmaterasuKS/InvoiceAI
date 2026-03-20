<script setup>
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const collapsed = defineModel("collapsed", { type: Boolean, default: false });

const route = useRoute();
const { t } = useI18n();

const items = computed(() => [
  {
    to: "/",
    label: t("nav.dashboard"),
    icon: "dashboard",
  },
  {
    to: "/invoices",
    label: t("nav.invoices"),
    icon: "invoices",
  },
  {
    to: "/clients",
    label: t("nav.clients"),
    icon: "clients",
  },
]);

const isActive = (path) => {
  if (path === "/") return route.path === "/";
  return route.path === path || route.path.startsWith(`${path}/`);
};

const widthClass = computed(() => (collapsed.value ? "is-collapsed" : "is-expanded"));

function toggle() {
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <aside class="sidebar" :class="widthClass" :aria-label="t('sidebar.navAria')">
    <div class="sidebar__glass">
      <div class="sidebar__brand">
        <div class="sidebar__logo" aria-hidden="true">
          <span class="sidebar__logo-mark">IA</span>
        </div>
        <transition name="fade-slide">
          <div v-if="!collapsed" class="sidebar__brand-text">
            <span class="sidebar__title">InvoiceAI</span>
            <span class="sidebar__subtitle">{{ t("sidebar.brandSub") }}</span>
          </div>
        </transition>
      </div>

      <nav class="sidebar__nav">
        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="sidebar__link"
          :class="{ 'sidebar__link--active': isActive(item.to) }"
        >
          <span class="sidebar__icon" aria-hidden="true">
            <svg v-if="item.icon === 'dashboard'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M4 13h4v8H4zM10 3h4v18h-4zM16 8h4v13h-4z"
              />
            </svg>
            <svg v-else-if="item.icon === 'invoices'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"
              />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M14 3v5h5" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zM4 21v-1c0-2.2 3.58-4 8-4 .94 0 1.84.08 2.67.23M20 21v-1c0-1.67-.98-3.1-2.4-3.76"
              />
            </svg>
          </span>
          <transition name="fade-slide">
            <span v-if="!collapsed" class="sidebar__label">{{ item.label }}</span>
          </transition>
          <span class="sidebar__glow" aria-hidden="true" />
        </RouterLink>
      </nav>

      <div class="sidebar__footer">
        <button
          type="button"
          class="sidebar__collapse"
          :title="collapsed ? t('sidebar.expand') : t('sidebar.collapse')"
          @click="toggle"
        >
          <span class="sidebar__icon sidebar__icon--btn" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                :d="collapsed ? 'M10 5l6 7-6 7' : 'M14 5l-6 7 6 7'"
              />
            </svg>
          </span>
          <transition name="fade-slide">
            <span v-if="!collapsed" class="sidebar__label">{{ t("sidebar.collapse") }}</span>
          </transition>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  --bg-deep: #0a0a0f;
  --card: #12121a;
  --accent: #6366f1;
  --accent-2: #8b5cf6;
  --text: #f8fafc;
  --muted: #94a3b8;
  position: relative;
  height: 100%;
  flex-shrink: 0;
  transition: width 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  width: 280px;
}

.sidebar.is-collapsed {
  width: 88px;
}

.sidebar__glass {
  height: 100%;
  margin: 12px;
  padding: 18px 14px;
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(18, 18, 26, 0.92), rgba(12, 12, 18, 0.75));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.12),
    0 24px 60px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 6px 8px;
}

.sidebar__logo {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.04em;
  color: #fff;
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.45);
}

.sidebar__brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sidebar__title {
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  letter-spacing: 0.02em;
}

.sidebar__subtitle {
  font-size: 11px;
  color: var(--muted);
}

.sidebar__nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 14px;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  transition:
    transform 0.25s ease,
    color 0.25s ease,
    box-shadow 0.25s ease;
}

.sidebar__link:hover {
  color: var(--text);
  transform: translateY(-2px);
}

.sidebar__link--active {
  color: var(--text);
}

.sidebar__glow {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  opacity: 0;
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.35), transparent 55%);
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.sidebar__link:hover .sidebar__glow,
.sidebar__link--active .sidebar__glow {
  opacity: 1;
}

.sidebar__link--active {
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.45),
    0 12px 40px rgba(99, 102, 241, 0.18);
  background: rgba(99, 102, 241, 0.12);
}

.sidebar__icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  z-index: 1;
}

.sidebar__icon svg {
  width: 100%;
  height: 100%;
}

.sidebar__label {
  z-index: 1;
  white-space: nowrap;
}

.sidebar__footer {
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar__collapse {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  transition:
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.sidebar__collapse:hover {
  color: var(--text);
  transform: translateY(-1px);
  border-color: rgba(99, 102, 241, 0.35);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.sidebar__icon--btn {
  color: var(--accent);
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
  transform: translateX(-6px);
}
</style>
