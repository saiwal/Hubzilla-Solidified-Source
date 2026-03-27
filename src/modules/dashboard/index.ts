import { registerModule } from "../../module-registry";

registerModule({
  id: "dashboard",
  routes: [{ path: "/hq", component: () => import("./views/DashboardView") }],
  navItem: { label: "Dashboard", icon: "grid", path: "/hq", href: "/hq" },
  widgets: [
    {
      id: "dashboard:stats",
      name: "Stats overview",
      description: "Key metrics at a glance",
      defaultSlot: "main",
      component: () => import("./widgets/StatsWidget"),
    },
    {
      id: "dashboard:activity",
      name: "Activity feed",
      description: "Recent activity stream",
      defaultSlot: "right",
      component: () => import("./widgets/ActivityWidget"),
    },
  ],
});
