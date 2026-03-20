import { defineStore } from "pinia";

export const useToastStore = defineStore("toast", {
  state: () => ({
    items: [],
  }),

  actions: {
    show({ message, type = "info", duration = 4200 }) {
      const id = crypto.randomUUID();
      const item = { id, message: String(message || ""), type };
      this.items.push(item);
      if (duration > 0) {
        setTimeout(() => this.dismiss(id), duration);
      }
      return id;
    },

    success(message, duration) {
      return this.show({ message, type: "success", duration });
    },

    error(message, duration) {
      return this.show({ message, type: "error", duration: duration ?? 6000 });
    },

    info(message, duration) {
      return this.show({ message, type: "info", duration });
    },

    dismiss(id) {
      this.items = this.items.filter((i) => i.id !== id);
    },
  },
});
