import { registerModule } from "../../module-registry";

registerModule({
  id: "dashboard",
  routes: [{ path: "/hq", component: () => import("./views/DashboardView") }],
  navItem: { label: "Dashboard", icon: "grid", path: "/hq", href: "/hq" },
  slots: {
    right: () => import("../../shared/ui/NotificationsAside"),
  },
  permissions: [],
});
