import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "connections",
  routes: [
    {
      path: "/connections",
      component: () => import("./views/ConnectionsView"),
    },
  ],
  navItem: {
    label: "Connections",
    icon: "connections",
    href: "/connections",
    path: "/connections",
    context: ["owner", "local"],
  },
});
