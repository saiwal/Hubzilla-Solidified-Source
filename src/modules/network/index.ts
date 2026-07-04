import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "network",
  routes: [
    { path: "/network", component: () => import("./views/NetworkView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.network"),
    icon: "network",
    path: "/network",
    href: "/network",
    context: "owner",
  },
  widgets: [
    {
      id: "network.filters",
      label: () => useI18n().t("widgets.stream_filters"),
      loader: () => import("./widgets/StreamFiltersWidget"),
      slot: "right",
      visitorVisible: false,
    },
    {
      id: "network.savedSearch",
      label: () => useI18n().t("widgets.saved_searches"),
      loader: () => import("./widgets/SavedSearchesWidget"),
      slot: "right",
      visitorVisible: false,
    },
  ],
  permissions: [],
});
