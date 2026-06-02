// src/modules/cal/index.ts

import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "cal",
  routes: [
    // /cal            → redirect or empty (no nick yet)
    { path: "/cdav/calendar", component: () => import("./views/CalView") },
    // /cal/:nick      → channel calendar
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
  slots: {},
  permissions: [],
  appName: "Calendar",
});
