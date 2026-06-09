import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

const filtersLoader      = () => import("./widgets/StreamFiltersWidget");
const savedSearchLoader  = () => import("./widgets/SavedSearchesWidget");

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
  slots: {
    right: [filtersLoader, savedSearchLoader],
  },
  permissions: [],
});
