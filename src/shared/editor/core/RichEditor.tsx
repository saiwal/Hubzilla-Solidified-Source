import { createEffect, onMount, Show } from "solid-js";
import type { EditorCapabilities, EditorTab } from "../types/editor.types";
import EditorToolbar from "./EditorToolbar";

interface Props {
  body: string;
  onInput: (v: string) => void;
  capabilities: EditorCapabilities;
  tab: EditorTab;
  onTabChange: (t: EditorTab) => void;
  onCtrlEnter?: () => void;
  placeholder?: string;
  minHeight?: string; // e.g. "120px" — defaults vary by toolbar level
}

export default function RichEditor(props: Props) {
  let editorRef: HTMLDivElement | undefined;
  let textareaRef: HTMLTextAreaElement | undefined;

  const minH = () =>
    props.minHeight ??
    (props.capabilities.toolbar === "comment" ? "60px" : "140px");

  // Seed contenteditable on mount
  onMount(() => {
    if (editorRef) editorRef.innerHTML = props.body;
  });

  // When body resets to "" externally (post-submit), clear the div too.
  // We only trigger on empty to avoid fighting contenteditable mid-type.
  createEffect(() => {
    if (props.body === "" && editorRef && editorRef.innerHTML !== "") {
      editorRef.innerHTML = "";
    }
  });

  // When switching source→wysiwyg, push textarea content back into div
  createEffect(() => {
    if (props.tab === "wysiwyg" && editorRef) {
      // props.body is already updated by textarea's onInput, just mirror it
      editorRef.innerHTML = props.body;
    }
  });

  const onEditorInput = () => {
    if (editorRef) props.onInput(editorRef.innerHTML);
  };

  const onTextareaInput = (e: InputEvent) => {
    props.onInput((e.target as HTMLTextAreaElement).value);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      props.capabilities.submitOnCtrlEnter &&
      e.key === "Enter" &&
      (e.ctrlKey || e.metaKey)
    ) {
      e.preventDefault();
      props.onCtrlEnter?.();
    }
  };

  const switchTab = (t: EditorTab) => {
    // wysiwyg→source: body already synced via onInput, nothing extra needed
    // source→wysiwyg: handled by the createEffect above
    props.onTabChange(t);
  };

  const showTabs = () => props.capabilities.toolbar !== "comment";

  return (
    <div class="rich-editor rounded-lg border border-rim overflow-hidden bg-surface">
      {/* ── Tab bar ──────────────────────────────────────── */}
      <Show when={showTabs()}>
        <div class="flex bg-elevated border-b border-rim">
          <TabBtn
            active={props.tab === "wysiwyg"}
            onClick={() => switchTab("wysiwyg")}
          >
            Write
          </TabBtn>
          <TabBtn
            active={props.tab === "source"}
            onClick={() => switchTab("source")}
          >
            BBCode
          </TabBtn>
        </div>
      </Show>

      {/* ── Toolbar (wysiwyg only) ────────────────────────── */}
      <Show when={props.tab === "wysiwyg"}>
        <EditorToolbar
          level={props.capabilities.toolbar}
          editorRef={() => editorRef}
        />
      </Show>

      {/* ── WYSIWYG surface ───────────────────────────────── */}
      <Show when={props.tab === "wysiwyg"}>
        <div
          ref={editorRef}
          contenteditable
          onInput={onEditorInput}
          onKeyDown={handleKeyDown}
          data-placeholder={props.placeholder ?? "What's on your mind?"}
          style={{ "min-height": minH() }}
          class="p-3 outline-none text-sm text-txt
                 empty:before:content-[attr(data-placeholder)]
                 empty:before:text-muted empty:before:pointer-events-none"
        />
      </Show>

      {/* ── BBCode source textarea ────────────────────────── */}
      <Show when={props.tab === "source"}>
        <textarea
          ref={textareaRef}
          value={props.body}
          onInput={onTextareaInput}
          onKeyDown={handleKeyDown}
          style={{ "min-height": minH() }}
          class="w-full p-3 text-sm font-mono bg-surface text-txt outline-none resize-y"
          placeholder="BBCode source…"
        />
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
