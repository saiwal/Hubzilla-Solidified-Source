// src/modules/post/index.ts
import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "post",
  routes: [
    { path: "/display/:uuid", component: () => import("./views/PostView") },
    { path: "/item/:uuid",    component: () => import("./views/PostView") },
  ],
});
