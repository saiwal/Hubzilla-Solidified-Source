import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { notificationSlot } from "@/shared/slots";

registerModule({
  id: "hq",
  routes: [{ path: "/hq", component: () => import("./views/HqView") }],
  navItem: {
    label: () => useI18n().t("nav.hq"),
    icon: "dashboard",
    path: "/hq",
    href: "/hq",
    context: "owner",
  },
  slots: {
    right: [
      notificationSlot,
      () => import("./widgets/ComposerWidget"),
    ],
  },
  permissions: [],
});
