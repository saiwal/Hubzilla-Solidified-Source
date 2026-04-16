import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "hq",
  routes: [{ path: "/hq", component: () => import("./views/HqView") }],
  navItem: {
    label: () => useI18n().t("nav.hq"),
    icon: "grid",
    path: "/hq",
    href: "/hq",
		context: "owner",
  },
  slots: {
    right: [
      () => import("./widgets/HqMessagesWidget"),
			() => import("./widgets/ComposerWidget"),
    ],
		// leftBottom: [
		// 	() => import("./widgets/ComposerWidget"),
		// ]
  },
  permissions: [],
});
