import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import type { SubPageItem } from "@/shared/views/SubPageLayout";

export const SETTINGS_ITEMS: SubPageItem[] = [
  { path: "profile",       label: () => useI18n().t("settings.title_profile") },
  { path: "account",       label: () => useI18n().t("settings.title_account") },
  { path: "privacy",       label: () => useI18n().t("settings.title_privacy") },
  { path: "notifications", label: () => useI18n().t("settings.title_notifications") },
  { path: "display",       label: () => useI18n().t("settings.title_display") },
  { path: "integrations",  label: () => useI18n().t("settings.title_integrations") },
  { path: "danger",        label: () => useI18n().t("settings.title_danger") },
];

// Derive all sub-routes from SETTINGS_ITEMS so the list is always in sync.
// Every path points to the same SettingsView — it does the section switching.
const settingsRoutes = SETTINGS_ITEMS.map((item) => ({
  path: `/settings/${item.path}`,
  component: () => import("./views/SettingsView"),
}));

registerModule({
  id: "settings",
  routes: [
    // Base path: on desktop defaults to the first section;
    // on mobile shows the nav list (atBase() === true in SubPageLayout).
    { path: "/settings", component: () => import("./views/SettingsView") },
    ...settingsRoutes,
  ],
  navItem: {
    label: () => useI18n().t("nav.settings"),
    icon: "settings",
    path: "/settings",
    href: "/settings",
    context: "owner",
    hidden: true,
  },
  slots: {},
  permissions: [],
});
