import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "notepad",
  routes: [
    { path: "/notepad", component: () => import("./views/NotepadView") },
  ],
  requiresAuth: true,
  navItem: {
    label: () => useI18n().t("notepad.title"),
    icon: "notepad",
    path: "/notepad",
    href: "/notepad",
		hidden: false,
    context: "local",
  },
  slots: {},
  permissions: [],
});
