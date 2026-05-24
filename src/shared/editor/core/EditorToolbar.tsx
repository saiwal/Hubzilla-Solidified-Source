import type { ToolbarLevel } from "../types/editor.types";

interface Props {
  level: ToolbarLevel;
  editorRef: () => HTMLDivElement | undefined;
}

export default function EditorToolbar(props: Props) {
  // Preserve selection — use onMouseDown + preventDefault so the editor
  // doesn't lose focus before execCommand runs
  const exec = (cmd: string, value?: string) => {
    const el = props.editorRef();
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, value);
  };

  const insertBlock = (tag: string) => {
    exec("formatBlock", tag);
  };

  const insertLink = () => {
    const url = prompt("URL:");
    if (url) exec("createLink", url);
  };

  const isComment = () => props.level === "comment";
  const isFull = () => props.level === "full";

  return (
    <div class="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-surface border-b border-rim">
      {/* Always-present inline formatting */}
      <ToolBtn title="Bold (Ctrl+B)" onMouseDown={() => exec("bold")}>
        <span class="font-bold text-xs">B</span>
      </ToolBtn>
      <ToolBtn title="Italic (Ctrl+I)" onMouseDown={() => exec("italic")}>
        <span class="italic text-xs">I</span>
      </ToolBtn>
      <ToolBtn title="Underline (Ctrl+U)" onMouseDown={() => exec("underline")}>
        <span class="underline text-xs">U</span>
      </ToolBtn>
      <ToolBtn title="Strikethrough" onMouseDown={() => exec("strikeThrough")}>
        <span class="line-through text-xs">S</span>
      </ToolBtn>
      <ToolBtn title="Highlight" onMouseDown={() => exec("hiliteColor", "yellow")}>
        <span class="text-xs bg-yellow-300 text-yellow-900 px-0.5 rounded-sm leading-tight">H</span>
      </ToolBtn>

      {/* Comment level stops here */}
      {!isComment() && (
        <>
          <Sep />
          <ToolBtn title="Link" onMouseDown={insertLink}>
            <span class="text-xs">🔗</span>
          </ToolBtn>
          <ToolBtn title="Bullet list" onMouseDown={() => exec("insertUnorderedList")}>
            <span class="text-xs">• –</span>
          </ToolBtn>
          <ToolBtn title="Numbered list" onMouseDown={() => exec("insertOrderedList")}>
            <span class="text-xs">1.</span>
          </ToolBtn>
        </>
      )}

      {/* Full level adds blocks */}
      {isFull() && (
        <>
          <Sep />
          <ToolBtn title="Heading 2" onMouseDown={() => insertBlock("h2")}>
            <span class="text-xs font-semibold">H2</span>
          </ToolBtn>
          <ToolBtn title="Heading 3" onMouseDown={() => insertBlock("h3")}>
            <span class="text-xs">H3</span>
          </ToolBtn>
          <ToolBtn title="Blockquote" onMouseDown={() => insertBlock("blockquote")}>
            <span class="text-xs">❝</span>
          </ToolBtn>
          <ToolBtn title="Code block" onMouseDown={() => insertBlock("pre")}>
            <span class="text-xs font-mono">{"</>"}</span>
          </ToolBtn>
          <Sep />
          <ToolBtn title="Align left" onMouseDown={() => exec("justifyLeft")}>
            <span class="text-xs">⬅</span>
          </ToolBtn>
          <ToolBtn title="Align center" onMouseDown={() => exec("justifyCenter")}>
            <span class="text-xs">↔</span>
          </ToolBtn>
          <ToolBtn title="Clear formatting" onMouseDown={() => exec("removeFormat")}>
            <span class="text-xs">✕</span>
          </ToolBtn>
        </>
      )}
    </div>
  );
}

function Sep() {
  return <span class="w-px h-4 bg-rim mx-0.5 self-center" />;
}

function ToolBtn(props: {
  title: string;
  onMouseDown: () => void;
  children: any;
}) {
  return (
    <button
      type="button"
      title={props.title}
      // onMouseDown + preventDefault keeps editor focus + selection intact
      onMouseDown={(e) => {
        e.preventDefault();
        props.onMouseDown();
      }}
      class="px-1.5 py-0.5 rounded text-txt hover:bg-elevated transition-colors"
    >
      {props.children}
    </button>
  );
}
