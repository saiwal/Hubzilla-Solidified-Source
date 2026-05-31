import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "logout",
  routes: [
    { path: "/logout", component: () => import("./views/LogoutView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.logout"),
    icon: "logout",
    path: "/logout",
    href: "/logout",
    context: ["owner", "local"],
    hidden: true,
  },
  slots: {},
  permissions: [],
});
