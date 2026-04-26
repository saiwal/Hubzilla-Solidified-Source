import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "pubsites",

  routes: [
    // Index — renders the shell (desktop defaults to Display; mobile shows list)
    { path: "/pubsites", component: () => import("./views/PubsitesView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.pubsites"),
    icon: "pubsites",
    path: "/pubsites",
    href: "/pubsites",
    context: "all",
		hidden: true,
  },

  slots: {
  },

  permissions: [],
});
