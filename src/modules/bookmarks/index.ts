// src/modules/bookmarks/index.ts
import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "bookmarks",
  routes: [
    { path: "/bookmarks", component: () => import("./views/BookmarksView") },
  ],
  requiresAuth: true,
  navItem: {
    label: () => useI18n().t("nav.bookmarks"),
    icon: "bookmark",
    path: "/bookmarks",
    href: "/bookmarks",
    context: "local",
  },
  slots: {},
  permissions: [],
});
