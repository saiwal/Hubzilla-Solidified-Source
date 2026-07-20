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
      loader: () => import("./widgets/ChannelConnectionsWidget"),
      ...channelWidgetPlacement,
      helpTarget: "channel.connections_widget",
    },
    {
      id: "channel.popular",
      label: () => useI18n().t("widgets.popular_posts"),
      loader: () => import("./widgets/ChannelPopularWidget"),
      ...channelWidgetPlacement,
      helpTarget: "channel.popular_posts_widget",
    },
    {
      id: "channel.categories",
      label: () => useI18n().t("widgets.categories"),
      loader: () => import("./widgets/ChannelCategoryWidget"),
      ...channelWidgetPlacement,
      helpTarget: "channel.categories_widget",
    },
    {
      id: "channel.tags",
      label: () => useI18n().t("widgets.tags"),
      loader: () => import("./widgets/ChannelTagWidget"),
      ...channelWidgetPlacement,
      helpTarget: "channel.tags_widget",
    },
    {
      id: "channel.archive",
      label: () => useI18n().t("widgets.archive"),
      loader: () => import("./widgets/ChannelArchiveWidget"),
      ...channelWidgetPlacement,
      helpTarget: "channel.archive_widget",
    },
    {
      // Opt-in alternate layout for channel.tags — picker only, no default placement
      id: "channel.tags_list",
      label: () => useI18n().t("widgets.tag_list"),
      loader: () => import("./widgets/ChannelTagListWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile"],
      helpTarget: "channel.tag_list_widget",
    },
    {
      // Opt-in alternate layout for channel.categories — picker only, no default placement
      id: "channel.categories_cloud",
      label: () => useI18n().t("widgets.category_cloud"),
      loader: () => import("./widgets/ChannelCategoryCloudWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile"],
      helpTarget: "channel.category_cloud_widget",
    },
    {
      // Opt-in alternate layout for channel.archive — picker only, no default placement
      id: "channel.archive_grid",
      label: () => useI18n().t("widgets.archive_grid"),
      loader: () => import("./widgets/ChannelArchiveGridWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile"],
      helpTarget: "channel.archive_grid_widget",
    },
    {
      // Opt-in vCard-style summary — picker only, no default placement.
      // Also placeable on /hq: usePageNick() falls back to the viewer's own
      // nick there, so it shows the owner's own card on their dashboard.
      id: "channel.contact_card",
      label: () => useI18n().t("widgets.contact_card"),
      loader: () => import("./widgets/ContactCardWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile", "hq"],
    },
    {
      // Opt-in GitHub-style posting activity graph — picker only, no default
      // placement. Also placeable on /hq (see channel.contact_card above).
      id: "channel.activity_heatmap",
      label: () => useI18n().t("widgets.activity_heatmap"),
      loader: () => import("./widgets/ActivityHeatmapWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile", "hq"],
    },
    // Same two widgets again under slot "mainTop", so they can be dropped
    // into HQ's top banner slot specifically.
    {
      id: "channel.contact_card_top",
      label: () => useI18n().t("widgets.contact_card"),
      loader: () => import("./widgets/ContactCardWidget"),
      slot: "mainTop",
      defaultModules: [],
      contexts: ["hq"],
    },
    {
      id: "channel.activity_heatmap_top",
      label: () => useI18n().t("widgets.activity_heatmap"),
      loader: () => import("./widgets/ActivityHeatmapWidget"),
      slot: "mainTop",
      defaultModules: [],
      contexts: ["hq"],
    },
  ],
  permissions: [],
});
