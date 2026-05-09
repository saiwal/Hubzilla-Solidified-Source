import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

const popularLoader = () =>
  import("./widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelPopularWidget }));
const categoryLoader = () =>
  import("./widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelCategoryWidget }));
const tagLoader = () =>
  import("./widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelTagWidget }));

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
    right: [popularLoader, categoryLoader, tagLoader],
  },
  permissions: [],
});
