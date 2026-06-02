import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "cloud",
  routes: [
    { path: "/cloud", component: () => import("./views/FilesView") },
    { path: "/cloud/:nick", component: () => import("./views/FilesView") },
    { path: "/cloud/:nick/*", component: () => import("./views/FilesView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.files"),
    icon: "files",
    path: "/cloud",
    href: () => `/cloud/${usePageNick()()}`,
		context: "all",
  },
  slots: {},
  permissions: [],
  appName: "Files",
});
