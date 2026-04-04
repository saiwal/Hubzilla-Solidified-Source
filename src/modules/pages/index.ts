import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "webpages",
  routes: [
    { path: "/webpages/:nick", component: () => import("./views/PagesView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.webpages"),
    icon: "grid",
    path: "/webpages",
    href: () => `/webpages/${usePageNick()()}`,
		context: "all",
  },
  slots: {
    right: () => import("../../shared/views/NotificationsAside"),
  },
  permissions: [],
});
