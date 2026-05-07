// src/shared/views/HelpOverlay.tsx
import { Show, Suspense } from "solid-js";
import { Portal } from "solid-js/web";
import { marked } from "marked";
import { useHelpMode, type DocType } from "@/shared/store/help-mode";
import { useDocs } from "@/shared/lib/useDocs";

export default function HelpOverlay() {
  const { helpMode, helpTarget, exit } = useHelpMode();

  return (
    <>
      <Show when={helpMode()}>
        <Portal>
          <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999]
                      flex items-center gap-3 px-4 py-2.5 rounded-xl
                      bg-blue-600 text-white text-sm shadow-lg">
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
              class="w-full max-w-2xl bg-surface rounded-xl border border-rim overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <HelpModalHeader target={helpTarget()!} onClose={exit} />
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

function HelpModalHeader(props: { target: string; onClose: () => void }) {
  const { docType, setDocType } = useHelpMode();

  const tabs: { id: DocType; label: string }[] = [
    { id: "user", label: "User Guide" },
    { id: "dev",  label: "Dev Guide"  },
  ];

  return (
    <div class="border-b border-rim">
      {/* top row: breadcrumb + close */}
      <div class="flex items-center justify-between px-5 pt-4 pb-3">
        <span class="text-sm font-medium text-txt">
          {props.target.split(".").join(" › ")}
        </span>
        <button
          onClick={props.onClose}
          class="text-muted hover:text-txt transition-colors leading-none"
        >
          ✕
        </button>
      </div>

      {/* tab row */}
      <div class="flex gap-1 px-5 pb-0">
        {tabs.map((tab) => (
          <button
            onClick={() => setDocType(tab.id)}
            class={`px-3 py-1.5 text-xs font-medium rounded-t-md border-b-2 transition-colors
              ${docType() === tab.id
                ? "border-accent text-accent bg-accent-muted"
                : "border-transparent text-muted hover:text-txt hover:bg-elevated"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DocContent(props: { target: string }) {
  const { docType } = useHelpMode();
  const [module, section] = props.target.split(".");
  const [md] = useDocs(module, docType);

  return (
    <Suspense fallback={
      <p class="text-sm text-muted animate-pulse">Loading…</p>
    }>
      <Show
        when={md()}
        fallback={
          <p class="text-sm text-muted">
            No {docType() === "dev" ? "developer" : "user"} documentation found for this section.
          </p>
        }
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
