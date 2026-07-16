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
  widgets: [
    {
      // Opt-in quota bar — picker only, no default placement
      id: "cloud.storage_usage",
      label: () => useI18n().t("widgets.storage_usage"),
      loader: () => import("./widgets/StorageUsageWidget"),
      slot: ["mainTop"],
      defaultModules: ["hq"],
      contexts: ["hq"],
    },
		{
      id: "cloud.storage_usage_right",
      label: () => useI18n().t("widgets.storage_usage"),
      loader: () => import("./widgets/StorageUsageWidget"),
      slot: ["right"],
      defaultModules: [],
      contexts: ["hq"],
    },
  ],
  permissions: [],
  appName: "Files",
});
