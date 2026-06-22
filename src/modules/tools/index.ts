import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { TOOLS } from "./tools-registry";

const toolView = () => import("./views/ToolsPage");

registerModule({
  id: "tools",
  routes: [
    { path: "/tools",      component: toolView },
    ...TOOLS.map((tool) => ({ path: `/tools/${tool.id}`, component: toolView })),
  ],
  navItem: {
    path: "/tools",
    href: "/tools",
    label: () => useI18n().t("nav.tools"),
    icon: "tools",
    hidden: false,
  },
});

export {};
