import { registerModule } from "@/shared/lib/module-registry";

registerModule({
  id: "profile",
  routes: [
    { path: "/profile/:nick", component: () => import("./views/ProfilePageView") },
  ],
  navItem: {
    label: "Profile",
    icon: "profile",
    path: "/profile",
    href: "/profile",
    context: "all",
    // hidden: true,
  },
  slots: {},
  permissions: [],
});
