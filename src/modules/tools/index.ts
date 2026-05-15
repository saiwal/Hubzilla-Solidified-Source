import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "tools",
  routes: [
    {
      path: "/tools",
      // Lazy import: module is only loaded when the user navigates to /tools.
      // Requires ToolsPage to have a default export — which it does.
      component: () => import("./views/ToolsPage"),
    },
  ],
  navItem: {
    path: "/tools",
    href: "tools",
    label: () => useI18n().t("nav.tools"),
    icon: "tools",
  },
});

export {};
