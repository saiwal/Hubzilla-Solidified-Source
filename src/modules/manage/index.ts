// modules/manage/index.ts

import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "manage",
  navItem: {
    label: () => useI18n().t("nav.channels"),
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
  requiresAuth: true,
});
