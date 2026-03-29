import { registerModule } from "../../module-registry";
import { useI18n } from "../../i18n";

registerModule({
  id: "dashboard",
  routes: [{ path: "/hq", component: () => import("./views/DashboardView") }],
  navItem: {
    label: () => useI18n().t("nav.dashboard"),
    icon: "grid",
    path: "/hq",
    href: "/hq",
  },
  slots: {
    right: () => import("../../shared/ui/NotificationsAside"),
  },
  permissions: [],
});

