import { registerModule } from "../../module-registry";
import { useI18n } from "../../i18n";

registerModule({
  id: "hq",
  routes: [{ path: "/hq", component: () => import("./views/HqView") }],
  navItem: {
    label: () => useI18n().t("nav.hq"),
    icon: "grid",
    path: "/hq",
    href: "/hq",
  },
  slots: {
    right: [
      () => import("../../shared/ui/NotificationsAside"),
      () => import("./widgets/HqMessagesWidget"),
			() => import("./widgets/ComposerWidget"),
    ],
  },
  permissions: [],
});
