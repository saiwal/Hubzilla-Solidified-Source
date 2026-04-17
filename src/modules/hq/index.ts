import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { notificationSlot, onlinecontactsSlot, weatherSlot } from "@/shared/slots";

registerModule({
  id: "hq",
  routes: [{ path: "/hq", component: () => import("./views/HqView") }],
  navItem: {
    label: () => useI18n().t("nav.hq"),
    icon: "grid",
    path: "/hq",
    href: "/hq",
    context: "owner",
  },
  slots: {
    right: [
      notificationSlot,
			onlinecontactsSlot,
			weatherSlot,
      () => import("./widgets/HqMessagesWidget"),
      () => import("./widgets/ComposerWidget"),
    ],
  },
  permissions: [],
});
