import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "admin",
  routes: [
    { path: "/admin", component: () => import("./views/AdminView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.admin"),
    icon: "grid",
    path: "/admin",
    href: "/admin/",
		context: "admin",
  },
  slots: {
    right: () => import("../../shared/views/NotificationsAside"),
  },
  permissions: [],
});
