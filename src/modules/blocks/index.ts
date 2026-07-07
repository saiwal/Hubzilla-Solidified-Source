// Generic content-block widgets — not tied to any Hubzilla app or route.
// All are multiInstance + configurable and live only in user layouts
// (defaultModules: []), placeable on any module's pages.

import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "blocks",
  routes: [],
  widgets: [
    {
      id: "blocks.rss",
      label: () => useI18n().t("widgets.rss_feed"),
      loader: () => import("./widgets/RssWidget"),
      slot: "right",
      defaultModules: [],
      contexts: "any",
      multiInstance: true,
      configComponent: () => import("./widgets/RssConfig"),
      helpTarget: "widgets.rss_feed_widget",
    },
    {
      id: "blocks.html",
      label: () => useI18n().t("widgets.html_block"),
      loader: () => import("./widgets/HtmlBlockWidget"),
      slot: "right",
      defaultModules: [],
      contexts: "any",
      multiInstance: true,
      configComponent: () => import("./widgets/HtmlBlockConfig"),
      helpTarget: "widgets.html_block_widget",
    },
    {
      id: "blocks.clock",
      label: () => useI18n().t("widgets.clock_card"),
      loader: () => import("./widgets/ClockWidget"),
      slot: "right",
      defaultModules: [],
      contexts: "any",
      multiInstance: true,
      configComponent: () => import("./widgets/ClockConfig"),
      helpTarget: "widgets.clock_card_widget",
    },
    {
      // Owner productivity tool, not page content — hidden from visitors
      id: "blocks.pomodoro",
      label: () => useI18n().t("widgets.pomodoro"),
      loader: () => import("./widgets/PomodoroWidget"),
      slot: "right",
      defaultModules: [],
      contexts: "any",
      multiInstance: true,
      visitorVisible: false,
      configComponent: () => import("./widgets/PomodoroConfig"),
      helpTarget: "widgets.pomodoro_widget",
    },
    {
      id: "blocks.links",
      label: () => useI18n().t("widgets.link_list"),
      loader: () => import("./widgets/LinkListWidget"),
      slot: "right",
      defaultModules: [],
      contexts: "any",
      multiInstance: true,
      configComponent: () => import("./widgets/LinkListConfig"),
      helpTarget: "widgets.link_list_widget",
    },
  ],
  permissions: [],
});
