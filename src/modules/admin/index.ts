import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import type { SubPageItem } from "@/shared/views/SubPageLayout";

export const ADMIN_ITEMS: SubPageItem[] = [
  { path: "summary", label: "Summary" },
  { path: "site", label: "Site" },
  { path: "accounts", label: "Accounts" },
  { path: "channels", label: "Channels" },
  { path: "security", label: "Security" },
  { path: "features", label: "Features" },
  { path: "addons", label: "Addons" },
  { path: "themes", label: "Themes" },
  { path: "inspect-queue", label: "Inspect Queue" },
  { path: "queueworker", label: "Queueworker" },
  { path: "profile-fields", label: "Profile Fields" },
  { path: "db-updates", label: "DB Updates" },
  { path: "logs", label: "Logs" },
];
// Derive all sub-routes from ADMIN_ITEMS so the list is always in sync.
// Every path points to the same SettingsView — it does the section switching.
const adminRoutes = ADMIN_ITEMS.map((item) => ({
  path: `/admin/${item.path}`,
  component: () => import("./views/AdminView"),
}));

registerModule({
  id: "admin",
  routes: [
    { path: "/admin", component: () => import("./views/AdminView") },
    ...adminRoutes,
  ],

  navItem: {
    label: () => useI18n().t("nav.admin"),
    icon: "admin",
    path: "/admin",
    href: "/admin",
    context: ["admin"],
    hidden: true,
  },
  slots: {},
});
