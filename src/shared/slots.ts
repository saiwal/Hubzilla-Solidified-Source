import { useI18n } from "@/i18n";
import type { WidgetDef } from "./types/module.types";

export const notificationsWidget: WidgetDef = {
  id: "shared.notifications",
  label: () => useI18n().t("widgets.notifications"),
  loader: () => import("./widgets/notifications/NotificationsAside"),
  slot: "right",
  contexts: "any",
  global: true,
  helpTarget: "notifications",
};

export const pinnedChatWidget: WidgetDef = {
  id: "chat.pinnedRooms",
  label: () => useI18n().t("widgets.pinned_chat"),
  loader: () => import("@/modules/chat/widgets/PinnedChatWidget"),
  slot: "right",
  contexts: "any",
  global: true,
  helpTarget: "chat.pinned_rooms_widget",
};
