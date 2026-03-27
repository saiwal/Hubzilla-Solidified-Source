import type { SlotName } from "./module.types";

export interface LayoutConfig {
  slots: Record<SlotName, string[]>; // slot → ordered widgetIds
}

export const defaultLayoutConfig: LayoutConfig = {
  slots: {
    left: [],
    main: [],
    right: [],
  },
};
