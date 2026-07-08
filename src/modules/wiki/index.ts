// src/modules/wiki/index.ts
import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "wiki",
  routes: [
    // Specific routes must precede the general one (same rule as articles)
    {
      path: "/wiki/:nick/:wikiName/:pageName",
      component: () => import("./views/WikiPageView"),
    },
    {
      path: "/wiki/:nick/:wikiName",
      component: () => import("./views/WikiPagesView"),
    },
    {
      path: "/wiki/:nick",
      component: () => import("./views/WikiListView"),
    },
  ],
  navItem: {
    label: () => useI18n().t("nav.wiki"),
    icon: "wiki",
    path: "/wiki",
    href: () => `/wiki/${usePageNick()()}`,
    // Wiki surfaces as a channel tab (via wiki_channel_apps hook → Hubzilla nav API),
    // not a standalone sidebar item — keep hidden from the main nav.
		context: 'all',
  },
  widgets: [
    {
      id: "wiki.list",
      label: () => useI18n().t("widgets.wiki_list"),
      loader: () => import("./widgets/WikiListWidget"),
      slot: "right",
      defaultModules: ["wiki", "channel"],
      helpTarget: "wiki.wiki_list_widget",
    },
  ],
  slots: {},
  permissions: [],
  appName: "Wiki",
});
