import { registerModule } from "../../module-registry";

registerModule({
  id: "network",
  routes: [{ path: "/network", component: () => import("./views/NetworkView") }],
  navItem: { label: "Network", icon: "grid", path: "/network", href: "/network" },
  slots: {
    right: () => import("../../shared/ui/NotificationsAside"),
  },
  permissions: [],
});
