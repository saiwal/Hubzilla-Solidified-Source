import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "profiles",
  routes: [
    { path: "/settings/profile",     component: () => import("./views/ProfilesView") },
    { path: "/settings/profile/:id", component: () => import("./views/ProfileEditView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.profiles"),
    icon: "manage",
    path: "/settings/profile",
    href: "/settings/profile",
    context: "owner",
    hidden: true,
  },
  slots: {},
  permissions: [],
});
