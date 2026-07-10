import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import type { SubPageItem } from "@/shared/views/SubPageLayout";

export const CONNECTIONS_ITEMS: SubPageItem[] = [
  { path: "connections", label: "Connections", context: "owner", requiresApp: "Connections" },
  { path: "contact-roles", label: "Contact roles", context: "owner", requiresApp: "Contact Roles" },
  {
    path: "privacy-groups",
    label: "Privacy groups",
    context: "owner",
    dividerAfter: true,
    requiresApp: "Privacy Groups",
  },
  {
    path: "people",
    label: "People & Groups",
    context: "all",
  },
  { path: "suggest", label: "Suggestions", context: ["local", "owner"], requiresApp: "Suggest Channels" },
  { path: "hubs", label: "Hubs", context: "all" },
];

const subRoutes = CONNECTIONS_ITEMS.map((item) => ({
  path: `/directory/${item.path}`,
  component: () => import("./views/ConnectionsShellView"),
}));

registerModule({
  id: "directory",
  routes: [
    {
      path: "/directory",
      component: () => import("./views/ConnectionsShellView"),
    },
    {
      path: "/directory/*",
      component: () => import("./views/ConnectionsShellView"),
    },
    ...subRoutes,
  ],
  navItem: {
    label: () => useI18n().t("nav.directory"),
    icon: "directory",
    path: "/directory",
    href: "/directory",
    context: "all",
  },
  slots: {},
  permissions: [],
});
