<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import gsap from "gsap";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();

const mode = ref("login");
const email = ref("");
const password = ref("");
const companyName = ref("");
const localError = ref("");

const rootRef = ref(null);

watch(
  () => route.query.mode,
  (m) => {
    if (m === "register") mode.value = "register";
    else if (m === "login") mode.value = "login";
  },
  { immediate: true }
);

watch(mode, async () => {
  localError.value = "";
  await nextTick();
  runEnterAnimation(rootRef.value?.querySelector(".auth__card") ?? rootRef.value);
});

function validate() {
  if (!email.value.trim()) {
    localError.value = t("auth.errors.emailRequired");
    return false;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    localError.value = t("auth.errors.emailInvalid");
    return false;
  }
  if (!password.value || password.value.length < 8) {
    localError.value = t("auth.errors.passwordShort");
    return false;
  }
  return true;
}

async function onSubmit() {
  localError.value = "";
  if (!validate()) return;

  try {
    if (mode.value === "login") {
      await auth.login({
        email: email.value.trim(),
        password: password.value,
      });
      toast.success(t("auth.toastWelcomeBack"));
    } else {
      await auth.register({
        email: email.value.trim(),
        password: password.value,
        companyName: companyName.value.trim() || undefined,
      });
      toast.success(t("auth.toastCreated"));
    }
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.replace(redirect);
  } catch (e) {
    localError.value = e.message || t("auth.errors.authFailed");
  }
}

function setMode(next) {
  mode.value = next;
  router.replace({ query: { ...route.query, mode: next } });
}

function runEnterAnimation(scopeEl) {
  const ctx = scopeEl || rootRef.value;
  if (!ctx) return;
  const targets = ctx.querySelectorAll(".auth-reveal");
  gsap.killTweensOf(targets);
  gsap.fromTo(
    targets,
    { y: 48, opacity: 0, filter: "blur(6px)" },
    {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.85,
      ease: "power3.out",
      stagger: 0.1,
      clearProps: "filter",
    }
  );
}

onMounted(async () => {
  await nextTick();
  runEnterAnimation();
});
</script>

<template>
  <div ref="rootRef" class="auth">
    <div class="auth__lang" aria-hidden="false">
      <LanguageSwitcher />
    </div>
    <div class="auth__bg" aria-hidden="true">
      <div class="auth__orb auth__orb--1" />
      <div class="auth__orb auth__orb--2" />
      <div class="auth__grid" />
    </div>

    <div class="auth__layout">
      <section class="auth__hero auth-reveal">
        <div class="auth__badge">{{ t("auth.badge") }}</div>
        <h1 class="auth__headline">{{ t("auth.headline") }}</h1>
        <p class="auth__lead">
          {{ t("auth.lead") }}
        </p>
        <ul class="auth__bullets">
          <li>{{ t("auth.bullet1") }}</li>
          <li>{{ t("auth.bullet2") }}</li>
          <li>{{ t("auth.bullet3") }}</li>
        </ul>
      </section>

      <section class="auth__panel auth-reveal">
        <div class="auth__card">
          <div class="auth__tabs auth-reveal" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'login'"
              class="auth__tab"
              :class="{ 'auth__tab--active': mode === 'login' }"
              @click="setMode('login')"
            >
              {{ t("auth.login") }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'register'"
              class="auth__tab"
              :class="{ 'auth__tab--active': mode === 'register' }"
              @click="setMode('register')"
            >
              {{ t("auth.register") }}
            </button>
          </div>

          <form class="auth__form" @submit.prevent="onSubmit">
            <div class="auth-reveal">
              <label class="auth__label" for="email">{{ t("auth.email") }}</label>
              <input
                id="email"
                v-model="email"
                class="auth__input"
                type="email"
                autocomplete="email"
                placeholder="you@company.com"
              />
            </div>

            <div v-if="mode === 'register'" class="auth-reveal">
              <label class="auth__label" for="company">{{ t("auth.companyOptional") }}</label>
              <input
                id="company"
                v-model="companyName"
                class="auth__input"
                type="text"
                autocomplete="organization"
                :placeholder="t('auth.companyPlaceholder')"
              />
            </div>

            <div class="auth-reveal">
              <label class="auth__label" for="password">{{ t("auth.password") }}</label>
              <input
                id="password"
                v-model="password"
                class="auth__input"
                type="password"
                autocomplete="current-password"
                :placeholder="t('auth.passwordPlaceholder')"
              />
            </div>

            <p v-if="localError || auth.error" class="auth__error auth-reveal" role="alert">
              {{ localError || auth.error }}
            </p>

            <button v-ripple class="auth__submit auth-reveal" type="submit" :disabled="auth.loading">
              <span class="auth__submit-text">{{
                auth.loading
                  ? t("auth.submitSending")
                  : mode === "login"
                    ? t("auth.submitLogin")
                    : t("auth.submitRegister")
              }}</span>
              <span class="auth__ripple" aria-hidden="true" />
            </button>
          </form>

          <p class="auth__hint auth-reveal">
            {{ mode === "login" ? t("auth.hintNoAccount") : t("auth.hintHasAccount") }}
            <button type="button" class="auth__link" @click="setMode(mode === 'login' ? 'register' : 'login')">
              {{ mode === "login" ? t("auth.linkRegister") : t("auth.linkLogin") }}
            </button>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.auth__lang {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 5;
}

.auth {
  --bg: #0a0a0f;
  --card: #12121a;
  --accent: #6366f1;
  --accent-2: #8b5cf6;
  --text: #f8fafc;
  --muted: #94a3b8;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  color: var(--text);
  background: var(--bg);
}

.auth__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.auth__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
}

.auth__orb--1 {
  width: 420px;
  height: 420px;
  top: -120px;
  right: -80px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.9), transparent 60%);
}

.auth__orb--2 {
  width: 380px;
  height: 380px;
  bottom: -140px;
  left: -100px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.85), transparent 60%);
}

.auth__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 50% 30%, black, transparent 70%);
  opacity: 0.35;
}

.auth__layout {
  position: relative;
  z-index: 1;
  max-width: 1120px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 48px);
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: clamp(24px, 4vw, 40px);
  align-items: center;
  min-height: 100vh;
}

.auth__hero {
  padding: 12px 8px;
}

.auth__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 18px;
}

.auth__headline {
  margin: 0 0 14px;
  font-size: clamp(32px, 4vw, 44px);
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.auth__lead {
  margin: 0 0 22px;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.65;
  max-width: 520px;
}

.auth__bullets {
  margin: 0;
  padding-left: 18px;
  color: #cbd5e1;
  line-height: 1.7;
  font-size: 14px;
}

.auth__panel {
  display: flex;
  justify-content: center;
}

.auth__card {
  width: min(440px, 100%);
  padding: clamp(22px, 3vw, 28px);
  border-radius: 22px;
  background: linear-gradient(155deg, rgba(18, 18, 26, 0.95), rgba(12, 12, 18, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 0 0 1px rgba(99, 102, 241, 0.12),
    0 30px 80px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.auth__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 6px;
  margin-bottom: 22px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.auth__tab {
  border: none;
  border-radius: 12px;
  padding: 12px 10px;
  font: inherit;
  font-weight: 600;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.auth__tab:hover {
  color: var(--text);
  transform: translateY(-1px);
}

.auth__tab--active {
  color: var(--text);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(139, 92, 246, 0.28));
  box-shadow: 0 12px 40px rgba(99, 102, 241, 0.25);
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

.auth__input {
  width: 100%;
  padding: 14px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 10, 15, 0.65);
  color: var(--text);
  font: inherit;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.auth__input:focus {
  border-color: rgba(99, 102, 241, 0.65);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  transform: translateY(-1px);
}

.auth__input::placeholder {
  color: rgba(148, 163, 184, 0.75);
}

.auth__error {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.35);
  color: #fecdd3;
  font-size: 13px;
}

.auth__submit {
  position: relative;
  margin-top: 6px;
  width: 100%;
  padding: 15px 16px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  overflow: hidden;
  font: inherit;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 18px 50px rgba(99, 102, 241, 0.45);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.auth__submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 22px 60px rgba(139, 92, 246, 0.45);
  filter: brightness(1.03);
}

.auth__submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.auth__submit-text {
  position: relative;
  z-index: 1;
}

.auth__ripple {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.45), transparent 55%);
  transform: scale(0.25);
  transition:
    opacity 0.45s ease,
    transform 0.55s ease;
}

.auth__submit:active:not(:disabled) .auth__ripple {
  opacity: 1;
  transform: scale(1.4);
}

.auth__hint {
  margin: 18px 0 0;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}

.auth__link {
  border: none;
  background: none;
  padding: 0;
  margin-left: 6px;
  color: #c7d2fe;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.auth__link:hover {
  color: #e0e7ff;
}

@media (max-width: 900px) {
  .auth__layout {
    grid-template-columns: 1fr;
  }

  .auth__hero {
    text-align: left;
  }
}
</style>
