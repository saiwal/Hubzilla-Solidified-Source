import { registerModule } from "@/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "settings",
  routes: [
    { path: "/settings", component: () => import("./views/SettingsView") },
    { path: "/settings/*", component: () => import("./views/SettingsView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.settings"),
    icon: "grid",
    path: "/settings",
    href: "/settings",
    context: "owner",
  },
  slots: {
    right: () => import("../../shared/views/NotificationsAside"),
  },
  permissions: [],
});

