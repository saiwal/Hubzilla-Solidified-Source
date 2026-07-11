import { createEffect, createSignal, onCleanup, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { EditorCapabilities, EditorTab, MimeType } from "../types/editor.types";
import EditorToolbar from "./EditorToolbar";
import EditorPreview from "./EditorPreview";
import { sourceToHtml, hydrateShareEmbeds } from "./sourceToHtml";
import { htmlToSource } from "./htmlToSource";
import { useI18n } from "@/i18n";

interface Props {
  body: string;
  onInput: (v: string) => void;
  capabilities: EditorCapabilities;
  tab: EditorTab;
  onTabChange: (t: EditorTab) => void;
  mimetype?: MimeType;
  onCtrlEnter?: () => void;
  /** Return true to consume Enter and suppress the default newline insertion. */
  onEnter?: () => boolean;
  /**
   * Receives files pasted from the clipboard (screenshots, copied images).
   * When set, file pastes are consumed here instead of the browser default,
   * which would dump the image into the WYSIWYG as an inline base64 blob.
   */
  onPasteFiles?: (files: File[]) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichEditor(props: Props) {
  const { t } = useI18n();
  let editorRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;
  // (mimetype, body) signature the DOM currently reflects — set whenever *we*
  // write to the DOM, whether from typing (DOM→body echo) or an external body
  // change. The sync effect only re-renders when props no longer match this,
  // so an external update (e.g. inserting an attachment) is never dropped.
  // A prior isUserTyping boolean tried to infer this from event timing, but a
  // stray "input" event (e.g. fired on blur when focus moved to an unrelated
  // button) could leave it stuck true and silently swallow the next sync.
  let domSig: string | null = null;

  const mime = (): MimeType => props.mimetype ?? "text/bbcode";
  const sig = () => `${mime()} ${props.body}`;
  const minH = () =>
    props.minHeight ??
    (props.capabilities.toolbar === "comment" ? "60px" : "140px");

  // Seed the WYSIWYG surface whenever it (re)mounts. The <Show> around the
  // surface destroys the div on every tab switch, so this must run per mount
  // (a plain onMount fires once per component and would leave the div blank
  // after source → wysiwyg round-trips).
  const seedEditor = (el: HTMLDivElement) => {
    editorRef = el;
    el.innerHTML = sourceToHtml(props.body, mime());
    domSig = sig();
    hydrateShareEmbeds(el);
    setImgSel(null);
  };

  // Re-render whenever body/mimetype changed for a reason other than us
  // echoing the DOM back (attachment insert, draft load, tab switch, reset, …).
  createEffect(() => {
    const nextSig = sig();
    if (props.tab === "wysiwyg" && editorRef && nextSig !== domSig) {
      editorRef.innerHTML = sourceToHtml(props.body, mime());
      domSig = nextSig;
      hydrateShareEmbeds(editorRef);
      setImgSel(null); // DOM was replaced — a selected <img> no longer exists
      // Placing a selection inside a contenteditable focuses it, so only move
      // the caret when focus isn't in another field (e.g. the alt-text box,
      // whose per-keystroke body patches land here).
      const active = document.activeElement;
      if (editorRef.contains(active) || active === document.body || active === null) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  });

  const onEditorInput = () => {
    if (!editorRef) return;
    // Convert WYSIWYG HTML back to the chosen source format before storing
    const next = htmlToSource(editorRef.innerHTML, mime());
    domSig = `${mime()} ${next}`;
    props.onInput(next);
  };

  const onTextareaInput = (e: InputEvent) => {
    props.onInput((e.target as HTMLTextAreaElement).value);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && props.onEnter?.()) {
      e.preventDefault();
      return;
    }
    if (
      props.capabilities.submitOnCtrlEnter &&
      e.key === "Enter" &&
      (e.ctrlKey || e.metaKey)
    ) {
      e.preventDefault();
      props.onCtrlEnter?.();
    }
  };

  // ── Image resize popup ─────────────────────────────────────────────────────
  // Click an image in the WYSIWYG → floating popup with preset sizes and a
  // px-width input. Only width is written (height cleared), so the aspect
  // ratio is always preserved; htmlToSource serializes it as [img width='N'].
  const [imgSel, setImgSel] = createSignal<{ el: HTMLImageElement; rect: DOMRect } | null>(null);
  const [widthVal, setWidthVal] = createSignal("");
  let popupRef: HTMLDivElement | undefined;

  const onEditorClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLImageElement && !t.closest(".bb-share-embed")) {
      setWidthVal(String(parseInt(t.style.width, 10) || Math.round(t.getBoundingClientRect().width)));
      setImgSel({ el: t, rect: t.getBoundingClientRect() });
    } else {
      setImgSel(null);
    }
  };

  const onDocClick = (e: MouseEvent) => {
    const sel = imgSel();
    if (!sel) return;
    const t = e.target as Node;
    if (t !== sel.el && !popupRef?.contains(t)) setImgSel(null);
  };
  document.addEventListener("click", onDocClick);
  onCleanup(() => document.removeEventListener("click", onDocClick));

  // width = null resets to the image's natural size
  const applyImgWidth = (w: number | null) => {
    const sel = imgSel();
    if (!sel) return;
    if (w === null) {
      sel.el.style.removeProperty("width");
    } else {
      sel.el.style.width = `${Math.max(16, Math.round(w))}px`;
    }
    sel.el.style.removeProperty("height");
    setWidthVal(String(Math.round(sel.el.getBoundingClientRect().width)));
    onEditorInput();
  };

  const popupStyle = () => {
    const r = imgSel()!.rect;
    // Above the image unless that would leave the viewport — then below it.
    return r.top > 72
      ? { left: `${Math.max(8, r.left)}px`, top: `${r.top - 8}px`, transform: "translateY(-100%)" }
      : { left: `${Math.max(8, r.left)}px`, top: `${r.bottom + 8}px` };
  };

  const handlePaste = (e: ClipboardEvent) => {
    if (!props.onPasteFiles) return;
    const dt = e.clipboardData;
    if (!dt) return;
    // dt.files misses some sources (e.g. certain Linux clipboard managers),
    // so fall back to scanning items for file entries.
    const files = dt.files.length
      ? Array.from(dt.files)
      : Array.from(dt.items)
          .filter((i) => i.kind === "file")
          .map((i) => i.getAsFile())
          .filter((f): f is File => f !== null);
    if (files.length === 0) return;
    e.preventDefault();
    props.onPasteFiles(files);
  };

  const isComment = () => props.capabilities.toolbar === "comment";
  const showTabs = () => !isComment() || props.capabilities.preview;
  // Every tabbed composer gets the BBCode source tab — including comments.
  // Untabbed surfaces (chat input: comment toolbar + preview:false) stay plain.
  const showSourceTab = () => showTabs();
  const showPreviewTab = () => props.capabilities.preview;

  return (
    <div class="rich-editor border border-rim overflow-hidden bg-surface flex flex-col flex-1 min-h-0">
      {/* ── Tab bar ──────────────────────────────────────── */}
      <Show when={showTabs()}>
        <div class="flex bg-elevated border-b border-rim">
          <TabBtn
            active={props.tab === "wysiwyg"}
            onClick={() => props.onTabChange("wysiwyg")}
          >
            {t("editor.write_tab")}
          </TabBtn>
          <Show when={showSourceTab()}>
            <TabBtn
              active={props.tab === "source"}
              onClick={() => props.onTabChange("source")}
            >
              {t("editor.source_tab")}
            </TabBtn>
          </Show>
          <Show when={showPreviewTab()}>
            <TabBtn
              active={props.tab === "preview"}
              onClick={() => props.onTabChange("preview")}
            >
              {t("editor.preview_tab")}
            </TabBtn>
          </Show>
        </div>
      </Show>

      {/* ── Unified toolbar (wysiwyg + source tabs) ── */}
      <Show when={props.tab !== "preview"}>
        <EditorToolbar
          level={props.capabilities.toolbar}
          tab={props.tab as "wysiwyg" | "source"}
          editorRef={() => editorRef}
          textareaRef={() => textareaRef}
          onSourceChange={(v) => { props.onInput(v); }}
        />
      </Show>

      {/* ── WYSIWYG surface ───────────────────────────────── */}
      <Show when={props.tab === "wysiwyg"}>
        <div
          ref={seedEditor}
          contenteditable
          dir="ltr"
          onInput={onEditorInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onClick={onEditorClick}
          data-placeholder={props.placeholder ?? t("editor.write_placeholder")}
          style={{ "min-height": minH() }}
          class="grow overflow-y-auto p-3 outline-none text-sm text-txt
                 [&_img]:max-w-full [&_img]:h-auto
                 empty:before:content-[attr(data-placeholder)]
                 empty:before:text-muted empty:before:pointer-events-none"
        />
      </Show>

      {/* ── Source textarea ───────────────────────────────── */}
      <Show when={props.tab === "source"}>
        <textarea
          ref={textareaRef}
          value={props.body}
          onInput={onTextareaInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          style={{ "min-height": minH() }}
          class="grow overflow-y-auto w-full p-3 text-sm font-mono bg-surface text-txt outline-none resize-none"
          placeholder={
            mime() === "text/markdown"
              ? t("editor.markdown_source_placeholder")
              : mime() === "text/html"
                ? t("editor.html_source_placeholder")
                : t("editor.bbcode_source_placeholder")
          }
        />
      </Show>

      {/* ── Image resize popup ───────────────────────────── */}
      <Show when={imgSel()}>
        <Portal>
          <div
            ref={popupRef}
            class="fixed z-[70] flex items-center gap-1 px-2 py-1.5 rounded-lg border border-rim
                   bg-surface shadow-xl"
            style={popupStyle()}
          >
            <For each={[25, 50, 75] as const}>
              {(pct) => (
                <button
                  type="button"
                  onClick={() => {
                    const el = imgSel()!.el;
                    const base = el.naturalWidth || el.getBoundingClientRect().width;
                    applyImgWidth((base * pct) / 100);
                  }}
                  class="px-1.5 py-0.5 rounded text-xs text-muted hover:bg-elevated hover:text-txt transition-colors"
                >
                  {pct}%
                </button>
              )}
            </For>
            <button
              type="button"
              onClick={() => applyImgWidth(null)}
              class="px-1.5 py-0.5 rounded text-xs text-muted hover:bg-elevated hover:text-txt transition-colors"
            >
              100%
            </button>
            <span class="w-px h-4 bg-rim mx-0.5" />
            <input
              type="number"
              min="16"
              title={t("editor.img_width")}
              value={widthVal()}
              onInput={(e) => setWidthVal(e.currentTarget.value)}
              onChange={(e) => {
                const w = parseInt(e.currentTarget.value, 10);
                if (w > 0) applyImgWidth(w);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const w = parseInt(widthVal(), 10);
                  if (w > 0) applyImgWidth(w);
                }
              }}
              class="w-16 px-1.5 py-0.5 text-xs rounded border border-rim bg-elevated text-txt
                     outline-none focus:border-accent/50"
            />
            <span class="text-[10px] text-muted">px</span>
          </div>
        </Portal>
      </Show>

      {/* ── Preview panel ────────────────────────────────── */}
      <Show when={props.tab === "preview"}>
        <div
          class="grow overflow-y-auto flex flex-col"
          style={{ "min-height": minH() }}
        >
          <EditorPreview body={props.body} mimetype={mime()} />
        </div>
      </Show>
    </div>
  );
}

function TabBtn(props: {
  active: boolean;
  onClick: () => void;
  children: any;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={`px-3 py-1.5 text-xs font-medium transition-colors border-b-2 ${
        props.active
          ? "border-accent text-accent bg-surface"
          : "border-transparent text-muted hover:text-txt"
      }`}
    >
      {props.children}
    </button>
  );
}
