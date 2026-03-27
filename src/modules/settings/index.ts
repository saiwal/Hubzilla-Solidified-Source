import { registerModule } from "../../module-registry";

registerModule({
  id: "settings",
  routes: [{ path: "/settings", component: () => import("./views/SettingsView") }],
  navItem: { label: "Settings", icon: "grid", path: "/settings", href: "/settings" },
  slots: {
    right: () => import("../../shared/ui/NotificationsAside"),
  },
  permissions: [],
});
