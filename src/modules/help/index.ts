// src/modules/help/index.tsx
import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "help",
  routes: [
    {
      path: "/help",
      component: () => import("./views/HelpView"),
    },
    {
      // Wildcard captures any depth: /help/about, /help/admin/toc, etc.
      path: "/help/*topic",
      component: () => import("./views/HelpView"),
    },
  ],
  navItem: {
    label: () => "Help",
    href: "/help",
    path: "/help",
    icon: "question",
    context: "all",
  },
});
