import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "notes",
  routes: [
    { path: "/notes",       component: () => import("./views/NotesView") },
    { path: "/notes/:nick", component: () => import("./views/NotesView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.notes"),
    icon: "note",
    path: "/notes",
    href: () => `/notes/${usePageNick()()}`,
    context: "local",
  },
  slots: {},
  permissions: [],
  appName: "Notes",
});
