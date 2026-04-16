import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick, useViewerRole } from "@/shared/store/site-config";

registerModule({
  id: "calendar",
  routes: [
    { path: "/cdav/calendar", component: () => import("./views/CalendarView") },
    { path: "/cal/:nick", component: () => import("./views/CalendarView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.calendar"),
    icon: "grid",
    path: "/cal",
    href: () => {
      const role = useViewerRole()();
      const nick = usePageNick()();
      if (role === "owner" || role === "admin") return "/cdav/calendar";
      return `/cal/${nick}`;
    },
    context: "all",
  },
  slots: {
  },
  permissions: [],
});
