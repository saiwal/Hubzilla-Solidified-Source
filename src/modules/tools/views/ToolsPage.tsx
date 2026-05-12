import { createMemo, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useI18n } from "@/i18n";
import { activeTool, setActiveTool } from "../store";
import { TOOLS } from "../tools-registry";

export function ToolsPage() {
  const { t } = useI18n();

  const activeEntry = createMemo(
    () => TOOLS.find((tool) => tool.id === activeTool()) ?? TOOLS[0]
  );

  // t() return type includes nested objects for top-level namespace keys.
  // Our keys are all leaf keys (e.g. "tools.calc") so the value is always a
  // string — String() narrows the type without a cast that could lie.
  const label = (key: Parameters<typeof t>[0]) => String(t(key));

  return (
    <div class="flex flex-col gap-6 px-4 py-6 max-w-2xl mx-auto w-full">
      {/* Tool picker tabs */}
      <nav
        class="flex flex-wrap gap-2"
        role="tablist"
        aria-label={label("tools.label")}
      >
        <For each={TOOLS}>
          {(tool) => (
            <button
              role="tab"
              aria-selected={activeTool() === tool.id}
              onClick={() => setActiveTool(tool.id)}
              class={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                activeTool() === tool.id
                  ? "bg-elevated text-txt border-rim-strong"
                  : "text-muted border-rim hover:bg-elevated hover:text-txt"
              }`}
            >
              <span aria-hidden="true">{tool.icon}</span>
              {label(tool.labelKey)}
            </button>
          )}
        </For>
      </nav>

      {/* Active tool panel */}
      <div
        class="bg-surface border border-rim rounded-xl p-6"
        role="tabpanel"
        aria-label={label(activeEntry().labelKey)}
      >
        <h2 class="text-txt font-medium text-lg mb-6">
          <span aria-hidden="true">{activeEntry().icon}</span>{" "}
          {label(activeEntry().labelKey)}
        </h2>
        <Dynamic component={activeEntry().component} />
      </div>
    </div>
  );
}

// Default export is required when the route uses a lazy import:
//   component: () => import("./views/ToolsPage")
// The named export above is kept for direct (non-lazy) imports.
export default ToolsPage;
