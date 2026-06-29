import { globalSlot } from "./lib/module-registry";

export const notificationSlot = globalSlot(
  () => import("./widgets/notifications/NotificationsAside")
);

export const pinnedChatSlot = globalSlot(
  () => import("@/modules/chat/widgets/PinnedChatWidget")
);

