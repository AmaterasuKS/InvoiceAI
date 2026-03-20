<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  notificationCount: {
    type: Number,
    default: 0,
  },
  showMenuToggle: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["menu-click", "notifications-click"]);

const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();

const menuOpen = ref(false);

const displayName = computed(() => {
  const u = auth.user;
  if (!u) return "Гость";
  return u.companyName?.trim() || u.email?.split("@")[0] || "Аккаунт";
});

const initials = computed(() => {
  const name = displayName.value || "";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "IA";
});

const subtitle = computed(() => auth.user?.email || "");

async function logout() {
  menuOpen.value = false;
  auth.logout();
  toast.info("Вы вышли из аккаунта");
  await router.push({ name: "auth" });
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function onNotifications() {
  emit("notifications-click");
}
</script>

<template>
  <header class="navbar">
    <div class="navbar__glass">
      <div class="navbar__left">
        <button
          v-if="showMenuToggle"
          type="button"
          class="navbar__icon-btn navbar__menu"
          aria-label="Меню"
          @click="emit('menu-click')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-width="1.75" d="M5 7h14M5 12h14M5 17h14" />
          </svg>
        </button>
        <div class="navbar__titles">
          <p v-if="title" class="navbar__title">{{ title }}</p>
          <p v-else class="navbar__title navbar__title--muted">Панель управления</p>
        </div>
      </div>

      <div class="navbar__right">
        <button type="button" class="navbar__notify" aria-label="Уведомления" @click="onNotifications">
          <span class="navbar__notify-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0h6z"
              />
            </svg>
          </span>
          <span v-if="notificationCount > 0" class="navbar__badge">{{ notificationCount > 9 ? "9+" : notificationCount }}</span>
          <span class="navbar__ripple" aria-hidden="true" />
        </button>

        <div class="navbar__user-wrap">
          <button type="button" class="navbar__user" aria-haspopup="menu" :aria-expanded="menuOpen" @click="toggleMenu">
            <span class="navbar__avatar" aria-hidden="true">{{ initials }}</span>
            <span class="navbar__user-meta">
              <span class="navbar__user-name">{{ displayName }}</span>
              <span v-if="subtitle" class="navbar__user-email">{{ subtitle }}</span>
            </span>
            <svg class="navbar__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M6 9l6 6 6-6" />
            </svg>
            <span class="navbar__ripple navbar__ripple--user" aria-hidden="true" />
          </button>

          <transition name="fade-scale">
            <div v-if="menuOpen" class="navbar__dropdown" role="menu">
              <button type="button" class="navbar__dropdown-item" role="menuitem" @click="logout">Выйти</button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  --bg-deep: #0a0a0f;
  --card: #12121a;
  --accent: #6366f1;
  --accent-2: #8b5cf6;
  --text: #f8fafc;
  --muted: #94a3b8;
  position: sticky;
  top: 0;
  z-index: 40;
  padding: 12px 12px 0;
}

.navbar__glass {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 18px;
  background: linear-gradient(120deg, rgba(18, 18, 26, 0.9), rgba(14, 14, 22, 0.78));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.1),
    0 18px 50px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.navbar__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.navbar__titles {
  min-width: 0;
}

.navbar__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navbar__title--muted {
  color: var(--muted);
  font-weight: 600;
}

.navbar__right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.navbar__icon-btn {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.navbar__icon-btn svg {
  width: 22px;
  height: 22px;
}

.navbar__icon-btn:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.2);
}

.navbar__notify {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  cursor: pointer;
  display: grid;
  place-items: center;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.navbar__notify:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 14px 36px rgba(139, 92, 246, 0.22);
}

.navbar__notify-icon svg {
  width: 22px;
  height: 22px;
}

.navbar__badge {
  position: absolute;
  top: 8px;
  right: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f43f5e, #fb7185);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px rgba(10, 10, 15, 0.9);
  animation: pulse-soft 2.4s ease-in-out infinite;
}

@keyframes pulse-soft {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 2px rgba(10, 10, 15, 0.9);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 4px rgba(244, 63, 94, 0.25);
  }
}

.navbar__ripple {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.45), transparent 60%);
  transform: scale(0.2);
  transition:
    opacity 0.45s ease,
    transform 0.5s ease;
}

.navbar__notify:active .navbar__ripple {
  opacity: 1;
  transform: scale(1.5);
}

.navbar__user-wrap {
  position: relative;
}

.navbar__user {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px 8px 8px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.navbar__user:hover {
  transform: translateY(-2px);
  border-color: rgba(99, 102, 241, 0.45);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35);
}

.navbar__user:active .navbar__ripple--user {
  opacity: 1;
  transform: scale(1.4);
}

.navbar__avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 10px 28px rgba(99, 102, 241, 0.45);
}

.navbar__user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.navbar__user-name {
  font-size: 14px;
  font-weight: 600;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navbar__user-email {
  font-size: 11px;
  color: var(--muted);
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navbar__chev {
  width: 18px;
  height: 18px;
  color: var(--muted);
  flex-shrink: 0;
}

.navbar__dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  min-width: 180px;
  padding: 8px;
  border-radius: 14px;
  background: rgba(18, 18, 26, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.navbar__dropdown-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.navbar__dropdown-item:hover {
  background: rgba(99, 102, 241, 0.15);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

@media (max-width: 720px) {
  .navbar__user-meta {
    display: none;
  }

  .navbar__chev {
    display: none;
  }
}
</style>
