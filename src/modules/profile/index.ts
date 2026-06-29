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
    hidden: true,
  },
  slots: {
    right: [
      () => import("@/shared/widgets/channelconnections"),
      () => import("@/modules/channel/widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelPopularWidget })),
      () => import("@/modules/channel/widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelCategoryWidget })),
      () => import("@/modules/channel/widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelTagWidget })),
      () => import("@/modules/channel/widgets/ChannelPostWidgets").then((m) => ({ default: m.ChannelArchiveWidget })),
    ],
  },
  permissions: [],
});
