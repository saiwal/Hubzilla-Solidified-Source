import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "settings",

  routes: [
    // Index — renders the shell (desktop defaults to Display; mobile shows list)
    { path: "/settings", component: () => import("./views/SettingsView") },
    // Sub-routes — same shell component; SectionOutlet picks the right view via useMatch
    { path: "/settings/display",       component: () => import("./views/SettingsView") },
    { path: "/settings/privacy",       component: () => import("./views/SettingsView") },
    { path: "/settings/notifications", component: () => import("./views/SettingsView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.settings"),
    icon: "grid",
    path: "/settings",
    href: "/settings",
    context: "owner",
  },

  slots: {
  },

  permissions: [],
});
