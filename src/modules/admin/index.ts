import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "admin",
  routes: [
    { path: "/admin", component: () => import("./views/AdminView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.admin"),
    icon: "admin",
    path: "/admin",
    href: "/admin/",
		context: "admin",
  },
  slots: {
  },
  permissions: [],
});
