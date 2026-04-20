import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "wiki",
  routes: [
    { path: "/wiki/:nick", component: () => import("./views/WikiView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.wiki"),
    icon: "wiki",
    path: "/wiki",
    href: () => `/wiki/${usePageNick()()}`,
		context: "all",
  },
  slots: {
  },
  permissions: [],
});
