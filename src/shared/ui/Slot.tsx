import { For, Suspense, lazy } from "solid-js";
import { getSlotWidgets } from "../../layout-store";
import { getWidget } from "../../widget-registry";
import type { SlotName } from "../types/module.types";

interface SlotProps {
  name: SlotName;
}

export default function Slot(props: SlotProps) {
  return (
    <For each={getSlotWidgets(props.name)}>
      {(widgetId) => {
        const def = getWidget(widgetId);
        if (!def) return null;
        const C = lazy(def.component);
        return (
          <Suspense fallback={<div class="p-3 text-sm text-gray-400">Loading...</div>}>
            <C />
          </Suspense>
        );
      }}
    </For>
  );
}
