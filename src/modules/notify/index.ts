// src/modules/notify/index.ts
import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "notify",
  routes: [
    { path: "/notify", component: () => import("./views/NotifyListView") },
    {
      path: "/notify/view/:id",
      component: () => import("./views/NotifyRedirectView"),
    },
  ],
  requiresAuth: true,
  permissions: [],
});
