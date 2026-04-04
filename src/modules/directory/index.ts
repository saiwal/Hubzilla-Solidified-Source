import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "directory",
  routes: [
    { path: "/directory", component: () => import("./views/DirectoryView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.directory"),
    icon: "grid",
    path: "/directory",
    href: "/directory/",
		context: "all",
  },
  slots: {
    right: () => import("../../shared/views/NotificationsAside"),
  },
  permissions: [],
});
