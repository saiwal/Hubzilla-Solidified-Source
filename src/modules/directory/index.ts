import { registerModule } from "@/shared/lib/module-registry";
// import { useI18n } from "@/i18n";
import type { SubPageItem } from "@/shared/views/SubPageLayout";

export const CONNECTIONS_ITEMS: SubPageItem[] = [
  { path: "connections", label: "Connections", context: "owner" },
  { path: "contact-roles", label: "Contact roles", context: "owner" },
  {
    path: "privacy-groups",
    label: "Privacy groups",
    context: "owner",
    dividerAfter: true,
  },
  {
    path: "people",
    label: "People & Groups",
    context: "all",
  },
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
    label: "Directory",
    icon: "directory",
    path: "/directory",
    href: "/directory",
    context: ["all"],
  },
  slots: {},
  permissions: [],
});
