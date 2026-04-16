import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "help",
  routes: [
    { path: "/help", component: () => import("./views/HelpView") },
  ],

  navItem: {
    label: () => useI18n().t("nav.help"),
    icon: "grid",
    path: "/help",
    href: "/help/",
		context: "all",
  },
  slots: {
  },
  permissions: [],
});
