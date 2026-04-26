import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "siteinfo",

  routes: [
    // Index — renders the shell (desktop defaults to Display; mobile shows list)
    { path: "/siteinfo", component: () => import("./views/SiteinfoView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.siteinfo"),
    icon: "siteinfo",
    path: "/siteinfo",
    href: "/siteinfo",
    context: "all",
		hidden: true,
  },

  slots: {
  },

  permissions: [],
});
