import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "channel",
  routes: [
    { path: "/channel", component: () => import("./views/ChannelView") },
    { path: "/channel/:nick", component: () => import("./views/ChannelView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.channel"),
    icon: "home",
    path: "/channel",
    href: () => `/channel/${usePageNick()()}`,
		context: "all",
  },
  slots: {
  },
  permissions: [],
});
