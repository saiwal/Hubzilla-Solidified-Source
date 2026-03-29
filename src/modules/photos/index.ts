import { registerModule } from "../../module-registry";
import { useI18n } from "../../i18n";

registerModule({
  id: "photos",
  routes: [{ path: "/photos", component: () => import("./views/PhotoView") }],
  navItem: {
    label: () => useI18n().t("nav.photos"),
    icon: "grid",
    path: "/photos",
    href: "/photos",
  },
  slots: {
    right: () => import("../../shared/views/NotificationsAside"),
  },
  permissions: [],
});
