import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "network",
  routes: [
    { path: "/network", component: () => import("./views/NetworkView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.network"),
    icon: "grid",
    path: "/network",
    href: "/network",
		context: "owner", 
  },
  slots: {
  },
  permissions: [],
});
