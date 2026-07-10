// src/modules/help/index.tsx
import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "help",
  routes: [
      {
      // Wildcard captures any depth: /help/about, /help/admin/toc, etc.
      path: "/help/*rest",
      component: () => import("./views/HelpView"),
    },
  ],
  navItem: {
    label: () => useI18n().t("nav.help"),
    href: "/help/user/",
    path: "/help",
    icon: "help",
    context: "all",
  },
});
