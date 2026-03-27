import { type Component, createResource, Show, Suspense } from "solid-js";
import { resolveSlot } from "../../module-registry";
import type { SlotsDef } from "../types/module.types";

interface SlotProps {
  name: keyof SlotsDef;
  moduleId?: string;
  fallback?: Component;
}

export default function Slot(props: SlotProps) {
  const loader = resolveSlot(props.name, props.moduleId);
  if (!loader) return null;

  const [mod] = createResource(loader);

  return (
    <Suspense fallback={<div class="p-4 text-sm text-gray-400">Loading...</div>}>
      <Show when={mod()}>
        {(m) => {
          const C = m().default;
          return <C />;
        }}
      </Show>
    </Suspense>
  );
}
