<script setup>
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { CURRENCY_CODES } from "@/data/currencies";

const props = defineProps({
  modelValue: {
    type: String,
    default: "USD",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  inputId: {
    type: String,
    default: "currency",
  },
});

const emit = defineEmits(["update:modelValue"]);

const { t, locale } = useI18n();

const open = ref(false);
const searchQuery = ref("");

function label(code) {
  if (!code) return "";
  const name = t(`currencies.${code}`);
  return `${code} — ${name}`;
}

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [...CURRENCY_CODES];
  return CURRENCY_CODES.filter((code) => {
    const name = t(`currencies.${code}`).toLowerCase();
    return code.toLowerCase().includes(q) || name.includes(q);
  });
});

watch(
  () => props.modelValue,
  () => {
    if (!open.value) {
      searchQuery.value = label(props.modelValue || "USD");
    }
  },
  { immediate: true }
);

watch(locale, () => {
  if (!open.value) {
    searchQuery.value = label(props.modelValue || "USD");
  }
});

function onFocus() {
  if (props.disabled) return;
  open.value = true;
  searchQuery.value = "";
}

function onInput(e) {
  searchQuery.value = e.target.value;
  open.value = true;
}

function select(code) {
  emit("update:modelValue", code);
  searchQuery.value = label(code);
  open.value = false;
}

function onBlur() {
  setTimeout(() => {
    open.value = false;
    searchQuery.value = label(props.modelValue || "USD");
  }, 180);
}

function onKeydown(e) {
  if (e.key === "Escape") {
    open.value = false;
    searchQuery.value = label(props.modelValue || "USD");
  }
}
</script>

<template>
  <div class="currency-combobox">
    <input
      :id="inputId"
      type="text"
      class="currency-combobox__input"
      :value="open ? searchQuery : label(modelValue)"
      :disabled="disabled"
      :placeholder="t('invoiceForm.currencySearch')"
      autocomplete="off"
      spellcheck="false"
      role="combobox"
      :aria-expanded="open"
      aria-autocomplete="list"
      @focus="onFocus"
      @input="onInput"
      @blur="onBlur"
      @keydown="onKeydown"
    />
    <ul
      v-show="open && filtered.length && !disabled"
      class="currency-combobox__list"
      role="listbox"
      :aria-label="t('invoiceForm.currency')"
    >
      <li
        v-for="code in filtered"
        :key="code"
        role="option"
        class="currency-combobox__item"
        :class="{ 'currency-combobox__item--active': code === modelValue }"
        @mousedown.prevent="select(code)"
      >
        {{ label(code) }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.currency-combobox {
  position: relative;
  width: 100%;
}

.currency-combobox__input {
  width: 100%;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 15, 0.65);
  color: #e2e8f0;
  font: inherit;
  font-size: 14px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.currency-combobox__input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.currency-combobox__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.currency-combobox__list {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 50;
  margin: 0;
  padding: 6px;
  max-height: min(280px, 42vh);
  overflow-y: auto;
  list-style: none;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(18, 18, 26, 0.98);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.12),
    0 24px 60px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(16px);
  /* Скролл как в AI-чате (.ai-chat-scroll-target) */
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.55) rgba(15, 23, 42, 0.55);
}

.currency-combobox__list::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.currency-combobox__list::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.65);
  border-radius: 100px;
  margin: 4px 0;
}

.currency-combobox__list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.55), rgba(139, 92, 246, 0.42));
  border-radius: 100px;
  border: 2px solid rgba(10, 10, 15, 0.5);
  background-clip: padding-box;
}

.currency-combobox__list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(129, 140, 248, 0.75), rgba(167, 139, 250, 0.5));
  border-color: rgba(10, 10, 15, 0.35);
}

.currency-combobox__list::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.currency-combobox__list::-webkit-scrollbar-corner {
  background: transparent;
}

.currency-combobox__item {
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
  color: #e2e8f0;
  transition: background 0.12s ease;
}

.currency-combobox__item:hover,
.currency-combobox__item--active {
  background: rgba(99, 102, 241, 0.2);
}
</style>
