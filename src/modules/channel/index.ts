import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";
import type { WidgetDef } from "@/shared/types/module.types";

// These widgets read the current page channel, so they also work on /profile
const channelWidgetPlacement: Pick<WidgetDef, "slot" | "defaultModules" | "contexts"> = {
  slot: "right",
  defaultModules: ["channel", "profile"],
  contexts: ["channel", "profile"],
};

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
  widgets: [
    {
      id: "channel.connections",
      label: () => useI18n().t("widgets.connections"),
      loader: () => import("@/shared/widgets/channelconnections"),
      ...channelWidgetPlacement,
    },
    {
      id: "channel.popular",
      label: () => useI18n().t("widgets.popular_posts"),
      loader: () => import("./widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelPopularWidget })),
      ...channelWidgetPlacement,
    },
    {
      id: "channel.categories",
      label: () => useI18n().t("widgets.categories"),
      loader: () => import("./widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelCategoryWidget })),
      ...channelWidgetPlacement,
    },
    {
      id: "channel.tags",
      label: () => useI18n().t("widgets.tags"),
      loader: () => import("./widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelTagWidget })),
      ...channelWidgetPlacement,
    },
    {
      id: "channel.archive",
      label: () => useI18n().t("widgets.archive"),
      loader: () => import("./widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelArchiveWidget })),
      ...channelWidgetPlacement,
    },
  ],
  permissions: [],
});
