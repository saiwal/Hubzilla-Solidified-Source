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
  widgets: [
    {
      id: "chat.bookmarkedRooms",
      label: () => useI18n().t("widgets.bookmarked_rooms"),
      loader: () => import("./widgets/BookmarkedRoomsWidget"),
      slot: "right",
      visitorVisible: false,
      helpTarget: "chat.bookmarked_rooms_widget",
    },
    {
      // Opt-in chatroom showcase; place several, each configured with a room
      id: "chat.room_card",
      label: () => useI18n().t("widgets.room_card"),
      loader: () => import("./widgets/RoomCardWidget"),
      slot: "right",
      defaultModules: [],
      contexts: ["channel", "profile", "chat"],
      multiInstance: true,
      configComponent: () => import("./widgets/RoomCardConfig"),
      helpTarget: "chat.room_card_widget",
    },
  ],
  permissions: [],
  appName: "Chatrooms",
});
