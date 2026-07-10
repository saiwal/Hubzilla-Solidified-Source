import { createEffect, onMount, Show } from "solid-js";
import type { EditorCapabilities, EditorTab, MimeType } from "../types/editor.types";
import EditorToolbar from "./EditorToolbar";
import EditorPreview from "./EditorPreview";
import { sourceToHtml } from "./sourceToHtml";
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

  // Seed WYSIWYG on mount: convert source body → HTML for display
  onMount(() => {
    if (!editorRef) return;
    editorRef.innerHTML = sourceToHtml(props.body, mime());
    domSig = sig();
  });

  // Re-render whenever body/mimetype changed for a reason other than us
  // echoing the DOM back (attachment insert, draft load, tab switch, reset, …).
  createEffect(() => {
    const nextSig = sig();
    if (props.tab === "wysiwyg" && editorRef && nextSig !== domSig) {
      editorRef.innerHTML = sourceToHtml(props.body, mime());
      domSig = nextSig;
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
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

  const isComment = () => props.capabilities.toolbar === "comment";
  const showTabs = () => !isComment() || props.capabilities.preview;
  const showSourceTab = () => !isComment();
  const showPreviewTab = () => props.capabilities.preview;

  return (
    <div class="rich-editor rounded-lg border border-rim overflow-hidden bg-surface flex flex-col flex-1 min-h-0">
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
          ref={editorRef}
          contenteditable
          dir="ltr"
          onInput={onEditorInput}
          onKeyDown={handleKeyDown}
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
