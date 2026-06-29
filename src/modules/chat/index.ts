// src/modules/chat/index.ts
import { registerModule } from "@/shared/lib/module-registry";
import { useI18n } from "@/i18n";
import { usePageNick } from "@/shared/store/site-config";

registerModule({
  id: "chat",
  routes: [
    // Room list: /chat/:nick
    {
      path: "/chat/:nick",
      component: () => import("./views/ChatRoomsView"),
    },
    // Individual room: /chat/:nick/:roomId
    {
      path: "/chat/:nick/:roomId",
      component: () => import("./views/ChatRoomView"),
    },
  ],
  navItem: {
    label: () => useI18n().t("nav.chat"),
    icon: "chat",
    path: "/chat",
    // nav link always targets the subject nick's chat
    href: () => `/chat/${usePageNick()()}`,
    context: "all", // only shown in channel context
    // hidden: true,       // excluded from main nav; shown via channel_tabs
  },
  slots: {
    right: [
      () => import("./widgets/BookmarkedRoomsWidget"),
    ],
  },
  permissions: [],
  appName: "Chatrooms",
});
