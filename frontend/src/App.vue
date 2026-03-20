<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import ToastStack from "@/components/ToastStack.vue";
import AIChat from "@/components/react/AIChat.jsx";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const auth = useAuthStore();
const { locale } = useI18n();
const aiMount = ref(null);
let reactRoot = null;

function renderAiChat() {
  if (!reactRoot) return;
  if (auth.token) {
    reactRoot.render(createElement(AIChat, { locale: locale.value }));
  } else {
    reactRoot.render(null);
  }
}

onMounted(() => {
  auth.hydrateFromStorage();
  if (auth.token) {
    auth.fetchMe().catch(() => {});
  }

  if (aiMount.value) {
    reactRoot = createRoot(aiMount.value);
    renderAiChat();
  }
});

watch(
  () => [auth.token, locale.value],
  () => {
    renderAiChat();
  }
);

onBeforeUnmount(() => {
  reactRoot?.unmount();
  reactRoot = null;
});
</script>

<template>
  <div class="app-root page-transition-root">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>

    <ToastStack />
    <div ref="aiMount" class="react-ai-host" aria-hidden="true" />
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.45s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.985);
  filter: blur(6px);
}

.react-ai-host {
  position: fixed;
  right: 0;
  bottom: 0;
  width: 0;
  height: 0;
  overflow: visible;
  pointer-events: none;
  z-index: 85;
}
</style>
