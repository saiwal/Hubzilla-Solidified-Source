import { globalSlot } from "./lib/module-registry";
// shared/slots.ts

export const notificationSlot = globalSlot(
  () => import("./widgets/notifications/NotificationsAside")
);


