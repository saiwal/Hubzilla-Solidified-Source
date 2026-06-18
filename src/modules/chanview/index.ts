import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "chanview",
  routes: [
    { path: "/chanview", component: () => import("./views/ChanView") },
  ],
  permissions: [],
});
