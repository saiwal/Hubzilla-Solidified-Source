import { Show, Suspense } from "solid-js";
import { Portal } from "solid-js/web";
import { marked } from "marked";
import { useHelpMode } from "@/shared/store/help-mode";
import { useDocs } from "@/shared/lib/useDocs";

export default function HelpOverlay() {
  const { helpMode, helpTarget, exit } = useHelpMode();

  return (
    <>
      <Show when={helpMode()}>
        <Portal>
          <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
                      flex items-center gap-3 px-4 py-2.5 rounded-xl
                      bg-blue-600 text-white text-sm">
            <span>Click on anything to get help with it</span>
            <button
              onClick={exit}
              class="text-blue-200 hover:text-white transition-colors leading-none"
            >
              ✕ Cancel
            </button>
          </div>
        </Portal>
      </Show>

      <Show when={helpTarget()}>
        <Portal>
          <div
            class="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4"
            onClick={exit}
          >
            <div
              class="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl
                     border border-gray-200 dark:border-gray-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="flex items-center justify-between px-5 py-4
                          border-b border-gray-200 dark:border-gray-700">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {helpTarget()!.split(".").join(" › ")}
                </span>
                <button
                  onClick={exit}
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>
              <div class="px-5 py-4 max-h-[60vh] overflow-y-auto">
                <DocContent target={helpTarget()!} />
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}

function DocContent(props: { target: string }) {
  const [module, section] = props.target.split(".");
  const [md] = useDocs(module);

  return (
    <Suspense fallback={
      <p class="text-sm text-gray-400 animate-pulse">Loading…</p>
    }>
      <Show
        when={md()}
        fallback={<p class="text-sm text-gray-400">No documentation found.</p>}
      >
        <div
          class="prose prose-sm dark:prose-invert max-w-none"
          innerHTML={marked.parse(extractSection(md()!, section)) as string}
        />
      </Show>
    </Suspense>
  );
}

function extractSection(md: string, section?: string): string {
  if (!section) return md;
  const slug = section.replace(/_/g, " ").toLowerCase();
  const lines = md.split("\n");
  let inside = false;
  const result: string[] = [];
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inside) break;
      if (line.replace("## ", "").toLowerCase() === slug) {
        inside = true;
        continue;
      }
    }
    if (inside) result.push(line);
  }
  return result.join("\n").trim() || md;
}
