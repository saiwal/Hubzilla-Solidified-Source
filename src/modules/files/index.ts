import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "files",
  routes: [
    { path: "/cloud/:nick", component: () => import("./views/FilesView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.files"),
    icon: "grid",
    path: "/files",
    href: () => `/cloud/${usePageNick()()}`,
		context: "all",
  },
  slots: {
    right: () => import("../../shared/views/NotificationsAside"),
  },
  permissions: [],
});
