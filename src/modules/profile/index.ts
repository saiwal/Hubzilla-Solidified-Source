import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "profile",
  routes: [
    { path: "/profile/:nick", component: () => import("./views/ProfilePageView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.profile"),
    icon: "profile",
    path: "/profile",
    href: "/profile",
    context: "all",
    hidden: true,
  },
  // Sidebar widgets come from the channel module — its widgets list
  // "profile" in their defaultModules.
  permissions: [],
});
