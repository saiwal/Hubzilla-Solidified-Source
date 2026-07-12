import { onMount, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { BiRegularX } from "solid-icons/bi";
import ArticleComposer from "./ArticleComposer";

// Modal wrapper around ArticleComposer (mirrors ArticleModal in ArticlesView).
// Uses a div-based modal (not <dialog>) so AclPicker's portaled dropdown
// stays in the normal stacking context and can appear above the overlay.

export default function ArticleComposerModal(props: {
  uid: number;
  nick: string;
  heading: string;
  initial?: {
    uuid: string;
    title: string;
    summary: string;
    slug: string;
    category: string;
    body: string;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  onMount(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  return (
    <Portal mount={document.body}>
      <div
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/50"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        <div class="relative w-full max-w-3xl rounded-xl bg-base border border-rim shadow-xl">
          <div class="flex items-center justify-between px-4 py-3 border-b border-rim bg-base rounded-t-xl">
            <h2 class="text-sm font-semibold text-txt">{props.heading}</h2>
            <button
              type="button"
              onClick={props.onClose}
              class="p-1 rounded text-muted hover:bg-elevated transition-colors"
            >
              <BiRegularX class="w-5 h-5" />
            </button>
          </div>
          <ArticleComposer
            profileUid={props.uid}
            nick={props.nick}
            initial={props.initial}
            onSaved={props.onSaved}
          />
        </div>
      </div>
    </Portal>
  );
}
