import { registerModule } from "../../module-registry";

registerModule({
  id: "photos",
  routes: [{ path: "/photos", component: () => import("./views/PhotoView") }],
  navItem: { label: "Photos", icon: "grid", path: "/photos", href: "/photos" },
  slots: {
    right: () => import("../../shared/ui/NotificationsAside"),
  },
  permissions: [],
});
