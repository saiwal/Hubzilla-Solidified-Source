// modules/manage/index.ts

import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "manage",
  navItem: {
    label: "Channels",
    icon: "manage",
    href: "/manage",
    path: "/manage",
    context: ["owner", "local"],
		hidden: true,
  },
  routes: [
    {
      path: "/manage",
      component: () => import("./views/ManagePage"),
    },
  ],
});
