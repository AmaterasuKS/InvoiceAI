<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { setLocale } from "@/i18n";

const { locale } = useI18n();

const isRu = computed(() => locale.value === "ru");
const isEn = computed(() => locale.value === "en");

function pick(lang) {
  setLocale(lang);
}
</script>

<template>
  <div
    class="lang-switch"
    role="group"
    :aria-label="$t('language.switch')"
  >
    <button
      type="button"
      class="lang-switch__btn"
      :class="{ 'lang-switch__btn--active': isRu }"
      @click="pick('ru')"
    >
      RU
    </button>
    <button
      type="button"
      class="lang-switch__btn"
      :class="{ 'lang-switch__btn--active': isEn }"
      @click="pick('en')"
    >
      EN
    </button>
  </div>
</template>

<style scoped>
.lang-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
}

.lang-switch__btn {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(226, 232, 240, 0.65);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    box-shadow 0.15s ease;
}

.lang-switch__btn:hover {
  color: rgba(248, 250, 252, 0.95);
  background: rgba(148, 163, 184, 0.12);
}

.lang-switch__btn--active {
  color: #f8fafc;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.55), rgba(79, 70, 229, 0.45));
  box-shadow:
    0 0 0 1px rgba(129, 140, 248, 0.35),
    0 8px 18px rgba(15, 23, 42, 0.35);
}

.lang-switch__btn:focus-visible {
  outline: 2px solid rgba(129, 140, 248, 0.75);
  outline-offset: 2px;
}
</style>
