import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { notificationsWidget, pinnedChatWidget } from "@/shared/slots";

registerModule({
  id: "hq",
  routes: [{ path: "/hq", component: () => import("./views/HqView") }],
  requiresAuth: true,
  navItem: {
    label: () => useI18n().t("nav.hq"),
    icon: "dashboard",
    path: "/hq",
    href: "/hq",
    context: "owner",
  },
  // Both are global: mounted on every page, not just /hq
  widgets: [notificationsWidget, pinnedChatWidget],
  permissions: [],
});
