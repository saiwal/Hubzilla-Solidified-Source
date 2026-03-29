import { type Component, createResource, For, Show, Suspense } from "solid-js";
import { resolveSlot } from "../../module-registry";
import type { SlotsDef } from "../types/module.types";

interface SlotProps {
  name: keyof SlotsDef;
  moduleId?: string;
  fallback?: Component;
}

function SlotEntry(props: { loader: () => Promise<{ default: Component }> }) {
  const [mod] = createResource(props.loader);
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

export default function Slot(props: SlotProps) {
  const raw = resolveSlot(props.name, props.moduleId);
  if (!raw) return null;

  const loaders = Array.isArray(raw) ? raw : [raw];

  return (
    <For each={loaders}>
      {(loader) => <SlotEntry loader={loader} />}
    </For>
  );
}
