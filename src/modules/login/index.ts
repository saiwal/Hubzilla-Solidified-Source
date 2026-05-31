import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "login",
  routes: [
    { path: "/login", component: () => import("./views/LoginView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.login"),
    icon: "login",
    path: "/login",
    href: "/login",
    context: "anonymous",
  },
  slots: {},
  permissions: [],
});
