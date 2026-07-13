// src/shared/views/ArticleToc.tsx
// Drop-in table-of-contents for long-form content (articles, help topics,
// webpages, …). Renders as a fixed sidebar column on xl+ and as a
// collapsed floating launcher (top-right) below xl. Place it as a sibling
// of the content column inside an `xl:flex xl:gap-8` container — the
// floating part is fixed-position so its DOM location doesn't matter.
import { createSignal, Show, For } from "solid-js";
import { MdOutlineToc } from "solid-icons/md";
import type { TocEntry } from "@/shared/lib/useToc";

function indentClass(level: number, minLevel: number): string {
  const d = level - minLevel;
  return d === 0 ? "" : d === 1 ? "pl-3" : "pl-6";
}

function TocLinks(props: {
  entries: TocEntry[];
  activeId: string;
  onNavigate?: () => void;
}) {
  const minLevel = () => Math.min(...props.entries.map((e) => e.level));
  return (
    <For each={props.entries}>
      {(entry) => (
        <a
          href={`#${entry.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth" });
            props.onNavigate?.();
          }}
          class={`block text-xs py-0.5 px-1 rounded transition-colors truncate
            ${indentClass(entry.level, minLevel())}
            ${props.activeId === entry.id
              ? "text-accent font-medium"
              : "text-muted hover:text-txt"
            }`}
        >
          {entry.text}
        </a>
      )}
    </For>
  );
}

// ── xl+ fixed sidebar ────────────────────────────────────────────────────────

function FixedToc(props: { entries: TocEntry[]; activeId: string; label: string }) {
  return (
    <nav class="xl:fixed xl:top-24 xl:w-52" aria-label={props.label}>
      <span class="text-xs font-semibold uppercase tracking-wide text-muted">
        {props.label}
      </span>
      <div class="mt-2 space-y-0.5 max-h-[70vh] overflow-y-auto">
        <TocLinks entries={props.entries} activeId={props.activeId} />
      </div>
    </nav>
  );
}

// ── below-xl floating collapsed launcher ────────────────────────────────────

function FloatingToc(props: { entries: TocEntry[]; activeId: string; label: string }) {
  const [open, setOpen] = createSignal(false);

  return (
    <div class="xl:hidden fixed top-20 right-4 z-40 flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open()}
        aria-label={props.label}
        class="w-11 h-11 rounded-full flex items-center justify-center
               bg-elevated border border-rim shadow-lg hover:shadow-xl
               text-muted hover:text-txt transition-all"
      >
        <MdOutlineToc size={20} />
      </button>
      <Show when={open()}>
        <div
          class="mt-2 w-64 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto
                 bg-surface border border-rim rounded-xl shadow-2xl p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-muted">
              {props.label}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close table of contents"
              class="p-1 rounded text-muted hover:bg-elevated hover:text-txt transition-colors"
            >
              ✕
            </button>
          </div>
          <div class="space-y-0.5">
            <TocLinks
              entries={props.entries}
              activeId={props.activeId}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      </Show>
    </div>
  );
}

// ── combined drop-in ─────────────────────────────────────────────────────────

export default function ArticleToc(props: { entries: TocEntry[]; activeId: string; label: string }) {
  return (
    <Show when={props.entries.length > 1}>
      <aside class="hidden xl:block shrink-0 w-52">
        <FixedToc entries={props.entries} activeId={props.activeId} label={props.label} />
      </aside>
      <FloatingToc entries={props.entries} activeId={props.activeId} label={props.label} />
    </Show>
  );
}
