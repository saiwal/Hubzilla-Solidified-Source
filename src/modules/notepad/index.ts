import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";

registerModule({
  id: "notepad",
  routes: [
    { path: "/notepad", component: () => import("./views/NotepadView") },
  ],
  navItem: {
    label: () => useI18n().t("notepad.title"),
    icon: "note",
    path: "/notepad",
    href: "/notepad",
		hidden: false,
    context: "local",
  },
  slots: {},
  permissions: [],
});
