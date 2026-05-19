import { type Component, createMemo, For } from "solid-js";
import { useLocation } from "@solidjs/router";
import {
  resolveModuleSlot,
  resolveGlobalSlots,
  getLazy,
  getGlobalVersion,
} from "@/shared/lib/module-registry";
import type { SlotsDef } from "../types/module.types";

interface SlotProps {
  name: keyof SlotsDef;
  moduleId?: string;
}

const Slot: Component<SlotProps> = (props) => {
  const location = useLocation();

  const activeModuleId = () => {
    if (props.moduleId) return props.moduleId;
    return location.pathname.split("/").filter(Boolean)[0] ?? "";
  };

  const globalVersion = getGlobalVersion();
  // Reactive: re-derives when new modules register global loaders after async import
  const globalWidgets = createMemo(() => {
    globalVersion(); // track
    return resolveGlobalSlots(props.name).map(getLazy);
  });

  // Module-local widgets — reactive, change when activeModuleId changes
  const localWidgets = createMemo(() =>
    resolveModuleSlot(props.name, activeModuleId()).map(getLazy)
  );

  return (
    <>
      {/* Always mounted — never torn down on module navigation */}
      <For each={globalWidgets()}>{(Widget) => <Widget />}</For>

      {/* Swapped per active module */}
      <For each={localWidgets()}>{(Widget) => <Widget />}</For>
    </>
  );
};

export default Slot;

