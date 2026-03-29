import { type Component, lazy, createMemo, For } from "solid-js";
import { useLocation } from "@solidjs/router";
import { resolveSlot } from "../../module-registry";
import type { SlotsDef } from "../types/module.types";

interface SlotProps {
  name: keyof SlotsDef;
  moduleId?: string;
}

type SlotLoader = () => Promise<{ default: Component }>;

const Slot: Component<SlotProps> = (props) => {
  const location = useLocation();

  const activeModuleId = () => {
    if (props.moduleId) return props.moduleId;
    const segment = location.pathname.split("/").filter(Boolean)[0];
    return segment ?? "";
  };

  const widgets = createMemo(() => {
    const loader = resolveSlot(props.name, activeModuleId());
    if (!loader) return [];
    const loaders = Array.isArray(loader) ? loader : [loader];
    return loaders.map((l: SlotLoader) =>
      lazy(l as () => Promise<{ default: Component }>)
    );
  });

  return (
    <For each={widgets()}>
      {(Widget) => <Widget />}
    </For>
  );
};

export default Slot;
