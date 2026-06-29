import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "register",
  routes: [
    { path: "/register", component: () => import("./views/RegisterView") },
    { path: "/regate/:token", component: () => import("./views/RegateView") },
  ],
  navItem: {
    label: () => useI18n().t("auth.register_link"),
    icon: "person-add",
    path: "/register",
    href: "/register",
    context: "anonymous",
  },
  slots: {},
  permissions: [],
});
