import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const routes = [
  {
    path: "/auth",
    name: "auth",
    component: () => import("@/views/Auth.vue"),
    meta: { public: true },
  },
  {
    path: "/",
    name: "dashboard",
    component: () => import("@/views/Dashboard.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/invoices",
    name: "invoices",
    component: () => import("@/views/Invoices.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/invoices/new",
    name: "create-invoice",
    component: () => import("@/views/CreateInvoice.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/clients",
    name: "clients",
    component: () => import("@/views/Clients.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, left: 0 };
  },
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  auth.hydrateFromStorage();

  if (to.meta.requiresAuth && !auth.token) {
    next({ name: "auth", query: { redirect: to.fullPath } });
    return;
  }

  if (to.name === "auth" && auth.token) {
    const redirect = typeof to.query.redirect === "string" ? to.query.redirect : "/";
    next(redirect);
    return;
  }

  next();
});

export default router;
