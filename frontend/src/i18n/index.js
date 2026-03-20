import { createI18n } from "vue-i18n";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

function getInitialLocale() {
  if (typeof localStorage === "undefined") return "ru";
  const saved = localStorage.getItem("invoiceai_locale");
  if (saved === "en" || saved === "ru") return saved;
  return "ru";
}

const locale = getInitialLocale();
if (typeof document !== "undefined") {
  document.documentElement.lang = locale === "en" ? "en" : "ru";
}

export const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: "ru",
  globalInjection: true,
  messages: {
    ru,
    en,
  },
});

export function setLocale(lang) {
  const next = lang === "en" ? "en" : "ru";
  const loc = i18n.global.locale;
  if (typeof loc === "string") {
    i18n.global.locale = next;
  } else if (loc && typeof loc === "object" && "value" in loc) {
    loc.value = next;
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("invoiceai_locale", next);
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next === "en" ? "en" : "ru";
  }
}
