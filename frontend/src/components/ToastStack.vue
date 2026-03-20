<script setup>
import { useI18n } from "vue-i18n";
import { useToastStore } from "@/stores/toast";

const { t } = useI18n();
const toast = useToastStore();
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-relevant="additions">
      <TransitionGroup name="toast">
        <div
          v-for="item in toast.items"
          :key="item.id"
          class="toast"
          :class="`toast--${item.type}`"
          role="status"
        >
          <button type="button" class="toast__close" :aria-label="t('toast.close')" @click="toast.dismiss(item.id)">
            ×
          </button>
          <p class="toast__text">{{ item.message }}</p>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(420px, calc(100vw - 36px));
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  position: relative;
  padding: 14px 40px 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(145deg, rgba(18, 18, 26, 0.98), rgba(12, 12, 18, 0.92));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(16px);
  overflow: hidden;
}

.toast::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.18), transparent 55%);
  pointer-events: none;
}

.toast--success {
  border-color: rgba(34, 197, 94, 0.35);
}

.toast--error {
  border-color: rgba(244, 63, 94, 0.45);
}

.toast--info {
  border-color: rgba(99, 102, 241, 0.35);
}

.toast__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: #e2e8f0;
}

.toast__close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(24px) scale(0.96);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
