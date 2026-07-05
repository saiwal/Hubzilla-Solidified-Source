// src/modules/cal/index.ts

import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

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
  widgets: [
    {
      id: "cal.calendar",
      label: () => useI18n().t("widgets.calendar"),
      loader: () => import("./widgets/CdavCalendarWidget"),
      slot: "right",
      visitorVisible: false,
    },
    {
      // Opt-in event showcase; place several, each configured with an event
      id: "cal.event_card",
      label: () => useI18n().t("widgets.event_card"),
      loader: () => import("./widgets/EventCardWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile", "cal"],
      multiInstance: true,
      configComponent: () => import("./widgets/EventCardConfig"),
    },
  ],
  permissions: [],
  appName: "Calendar",
});
