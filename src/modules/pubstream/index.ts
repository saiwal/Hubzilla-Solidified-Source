// src/modules/pubstream/index.ts
import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";


registerModule({
  id: "pubstream",
  routes: [
    {
      path: "/pubstream",
      component: () => import("./views/PubstreamView"),
    },
  ],
  navItem: {
    path: "/pubstream",
    label: () => useI18n().t("nav.pubstream"),
    icon: "Public",
		href: "/pubstream",
		context: "all",
  },
});
