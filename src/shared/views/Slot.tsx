import { type Component, createMemo, For } from "solid-js";
import { useLocation } from "@solidjs/router";
import {
  resolveModuleSlot,
  resolveGlobalSlots,
  getLazy,
  getGlobalVersion,
  isModuleActive,
  moduleIdForPath,
} from "@/shared/lib/module-registry";
import { useInstalledApps } from "@/shared/store/nav-store";
import type { SlotsDef } from "../types/module.types";

interface SlotProps {
  name: keyof SlotsDef;
  moduleId?: string;
}

const Slot: Component<SlotProps> = (props) => {
  const location = useLocation();
  const installedApps = useInstalledApps();

  const activeModuleId = () => {
    if (props.moduleId) return props.moduleId;
    return moduleIdForPath(location.pathname);
  };

  const globalVersion = getGlobalVersion();
  // Reactive: re-derives when new modules register global loaders after async import
  const globalWidgets = createMemo(() => {
    globalVersion(); // track
    return resolveGlobalSlots(props.name).map(getLazy);
  });

  // Module-local widgets — only rendered when the module's app is installed
  const localWidgets = createMemo(() => {
    if (!isModuleActive(activeModuleId(), installedApps())) return [];
    return resolveModuleSlot(props.name, activeModuleId()).map(getLazy);
  });

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

