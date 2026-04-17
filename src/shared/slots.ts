import { globalSlot } from "./lib/module-registry";
// shared/slots.ts
export const placeholderSlot = globalSlot(
  () => import("./widgets/placeholder/view")
);

export const notificationSlot = globalSlot(
  () => import("./widgets/notifications/NotificationsAside")
);

export const onlinecontactsSlot = globalSlot(
  () => import("./widgets/onlinecontacts/view")
);

export const weatherSlot = globalSlot(
  () => import("./widgets/weather/view")
);
