import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "chat",
  routes: [
    { path: "/chat/:nick", component: () => import("./views/RoomListView") },
    { path: "/chat/:nick/:roomId", component: () => import("./views/RoomView") },
  ],
  navItem: {
    label: () => useI18n().t("nav.chat"),
    icon: "chat",
    path: "/chat/:nick",
    href: () => {
      const nick = usePageNick()();
      return nick ? `/chat/${nick}` : "/chat";
    },
    context: ["owner", "local", "remote"],
  },
  permissions: [],
});
