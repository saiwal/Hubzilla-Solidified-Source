import { Show, onMount } from "solid-js";
import type { EditorCapabilities, EditorTab } from "../types/editor.types";

interface Props {
  body: string;
  onInput: (v: string) => void;
  capabilities: EditorCapabilities;
  tab: EditorTab;
  onTabChange: (t: EditorTab) => void;
  onCtrlEnter?: () => void;
  placeholder?: string;
}

export default function RichEditor(props: Props) {
  let editorRef!: HTMLDivElement;
  let textareaRef!: HTMLTextAreaElement;

  // Sync contenteditable from external body signal when tab switches
  // (e.g. source → wysiwyg: push textarea value into div)
  onMount(() => {
    editorRef.innerHTML = props.body;
  });

  const onEditorInput = () => {
    props.onInput(editorRef.innerHTML);
  };

  const onTextareaInput = (e: InputEvent) => {
    props.onInput((e.target as HTMLTextAreaElement).value);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.capabilities.submitOnCtrlEnter && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      props.onCtrlEnter?.();
    }
  };

  const switchTab = (t: EditorTab) => {
    if (t === "source" && props.tab === "wysiwyg") {
      // wysiwyg → source: copy innerHTML as body (caller already has it via onInput)
    }
    if (t === "wysiwyg" && props.tab === "source") {
      // source → wysiwyg: push raw text back into div
      editorRef.innerHTML = props.body;
    }
    props.onTabChange(t);
  };

  const isComment = () => props.capabilities.toolbar === "comment";

  return (
    <div class="rich-editor border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Tab bar — hidden for comment composer */}
      <Show when={!isComment()}>
        <div class="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={() => switchTab("wysiwyg")}
            class={`px-3 py-1.5 text-xs font-medium transition-colors ${
              props.tab === "wysiwyg"
                ? "bg-white dark:bg-gray-800 border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => switchTab("source")}
            class={`px-3 py-1.5 text-xs font-medium transition-colors ${
              props.tab === "source"
                ? "bg-white dark:bg-gray-800 border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            BBCode
          </button>
        </div>
      </Show>

      {/* Toolbar */}
      <Show when={props.tab === "wysiwyg"}>
        <EditorToolbar capabilities={props.capabilities} editorRef={() => editorRef} />
      </Show>

      {/* WYSIWYG surface */}
      <Show when={props.tab === "wysiwyg"}>
        <div
          ref={editorRef}
          contenteditable
          onInput={onEditorInput}
          onKeyDown={handleKeyDown}
          data-placeholder={props.placeholder ?? "What's on your mind?"}
          class="min-h-[80px] p-3 outline-none text-sm
                 empty:before:content-[attr(data-placeholder)]
                 empty:before:text-gray-400 dark:empty:before:text-gray-500"
        />
      </Show>

      {/* Source tab */}
      <Show when={props.tab === "source"}>
        <textarea
          ref={textareaRef}
          value={props.body}
          onInput={onTextareaInput}
          onKeyDown={handleKeyDown}
          rows={4}
          class="w-full p-3 text-sm font-mono bg-white dark:bg-gray-900 outline-none resize-y"
          placeholder="BBCode source..."
        />
      </Show>
    </div>
  );
}

// ── Inline toolbar ─────────────────────────────────────────────────────────────

function EditorToolbar(props: {
  capabilities: EditorCapabilities;
  editorRef: () => HTMLDivElement;
}) {
  const exec = (cmd: string, value?: string) => {
    props.editorRef().focus();
    document.execCommand(cmd, false, value);
  };

  const minimal = () => props.capabilities.toolbar === "comment";

  return (
    <div class="flex flex-wrap gap-0.5 p-1 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
      <ToolBtn title="Bold" onClick={() => exec("bold")}><b>B</b></ToolBtn>
      <ToolBtn title="Italic" onClick={() => exec("italic")}><i>I</i></ToolBtn>
      <ToolBtn title="Underline" onClick={() => exec("underline")}><u>U</u></ToolBtn>
      <Show when={!minimal()}>
        <span class="w-px bg-gray-200 dark:bg-gray-700 mx-0.5" />
        <ToolBtn title="Link" onClick={() => {
          const url = prompt("URL:");
          if (url) exec("createLink", url);
        }}>🔗</ToolBtn>
        <ToolBtn title="Blockquote" onClick={() => exec("formatBlock", "blockquote")}>❝</ToolBtn>
        <ToolBtn title="Code" onClick={() => exec("formatBlock", "pre")}>{"</>"}</ToolBtn>
        <ToolBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}>•</ToolBtn>
        <ToolBtn title="Numbered list" onClick={() => exec("insertOrderedList")}>1.</ToolBtn>
      </Show>
    </div>
  );
}

function ToolBtn(props: { title: string; onClick: () => void; children: any }) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      class="px-2 py-0.5 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      {props.children}
    </button>
  );
}
