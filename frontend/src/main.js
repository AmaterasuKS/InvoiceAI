import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { i18n } from "./i18n";
import "./assets/main.css";

function rippleDirective(el, binding) {
  const color = binding.value?.color || "rgba(255,255,255,0.35)";
  const duration = binding.value?.duration ?? 550;

  if (el.dataset.rippleBound === "1") return;
  el.dataset.rippleBound = "1";
  el.style.position = el.style.position || "relative";
  el.style.overflow = "hidden";

  el.addEventListener(
    "click",
    (e) => {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const wave = document.createElement("span");
      wave.style.position = "absolute";
      wave.style.left = `${x}px`;
      wave.style.top = `${y}px`;
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.borderRadius = "50%";
      wave.style.background = color;
      wave.style.transform = "scale(0)";
      wave.style.opacity = "0.45";
      wave.style.pointerEvents = "none";
      wave.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
      el.appendChild(wave);
      requestAnimationFrame(() => {
        wave.style.transform = "scale(1)";
        wave.style.opacity = "0";
      });
      setTimeout(() => wave.remove(), duration + 40);
    },
    { passive: true }
  );
}

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(i18n);
app.use(router);
app.directive("ripple", rippleDirective);
app.mount("#app");
