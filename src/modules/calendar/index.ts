// src/modules/cal/index.ts

import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

const cdavWidgetLoader = () => import("./widgets/CdavCalendarWidget");

registerModule({
  id: "cal",
  routes: [
    { path: "/cdav/calendar", component: () => import("./views/CalView") },
    { path: "/cal/:nick", component: () => import("./views/CalView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.calendar"),
    icon: "calendar",
    path: "/cal",
    href: () => `/cal/${usePageNick()()}`,
    context: "all",
    hidden: false,
  },
  slots: {
    right: [cdavWidgetLoader],
  },
  permissions: [],
  appName: "Calendar",
});
