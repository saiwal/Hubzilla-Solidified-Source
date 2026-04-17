import { type Component, createMemo, For } from "solid-js";
import { useLocation } from "@solidjs/router";
import {
  resolveModuleSlot,
  resolveGlobalSlots,
  getLazy,
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

  // Global widgets — stable array, computed once (modules don't unregister)
  // getLazy caches by loader identity so components are never recreated
  const globalWidgets = resolveGlobalSlots(props.name).map(getLazy);

  // Module-local widgets — reactive, change when activeModuleId changes
  const localWidgets = createMemo(() =>
    resolveModuleSlot(props.name, activeModuleId()).map(getLazy)
  );

  return (
    <>
      {/* Always mounted — never torn down on module navigation */}
      <For each={globalWidgets}>{(Widget) => <Widget />}</For>

      {/* Swapped per active module */}
      <For each={localWidgets()}>{(Widget) => <Widget />}</For>
    </>
  );
};

export default Slot;

