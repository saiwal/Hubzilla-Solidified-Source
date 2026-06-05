import type { ToolbarLevel } from "../types/editor.types";
import { useI18n } from "@/i18n";

interface Props {
  level: ToolbarLevel;
  editorRef: () => HTMLDivElement | undefined;
}

export default function EditorToolbar(props: Props) {
  const { t } = useI18n();
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
      <ToolBtn title={t("editor.bold")} onMouseDown={() => exec("bold")}>
        <span class="font-bold text-xs">B</span>
      </ToolBtn>
      <ToolBtn title={t("editor.italic")} onMouseDown={() => exec("italic")}>
        <span class="italic text-xs">I</span>
      </ToolBtn>
      <ToolBtn title={t("editor.underline")} onMouseDown={() => exec("underline")}>
        <span class="underline text-xs">U</span>
      </ToolBtn>
      <ToolBtn title={t("editor.strikethrough")} onMouseDown={() => exec("strikeThrough")}>
        <span class="line-through text-xs">S</span>
      </ToolBtn>
      <ToolBtn title={t("editor.highlight")} onMouseDown={() => exec("hiliteColor", "yellow")}>
        <span class="text-xs bg-yellow-300 text-yellow-900 px-0.5 rounded-sm leading-tight">H</span>
      </ToolBtn>

      {/* Comment level stops here */}
      {!isComment() && (
        <>
          <Sep />
          <ToolBtn title={t("editor.link")} onMouseDown={insertLink}>
            <span class="text-xs">🔗</span>
          </ToolBtn>
          <ToolBtn title={t("editor.bullet_list")} onMouseDown={() => exec("insertUnorderedList")}>
            <span class="text-xs">• –</span>
          </ToolBtn>
          <ToolBtn title={t("editor.numbered_list")} onMouseDown={() => exec("insertOrderedList")}>
            <span class="text-xs">1.</span>
          </ToolBtn>
        </>
      )}

      {/* Full level adds blocks */}
      {isFull() && (
        <>
          <Sep />
          <ToolBtn title={t("editor.heading2")} onMouseDown={() => insertBlock("h2")}>
            <span class="text-xs font-semibold">H2</span>
          </ToolBtn>
          <ToolBtn title={t("editor.heading3")} onMouseDown={() => insertBlock("h3")}>
            <span class="text-xs">H3</span>
          </ToolBtn>
          <ToolBtn title={t("editor.blockquote")} onMouseDown={() => insertBlock("blockquote")}>
            <span class="text-xs">❝</span>
          </ToolBtn>
          <ToolBtn title={t("editor.code_block")} onMouseDown={() => insertBlock("pre")}>
            <span class="text-xs font-mono">{"</>"}</span>
          </ToolBtn>
          <Sep />
          <ToolBtn title={t("editor.align_left")} onMouseDown={() => exec("justifyLeft")}>
            <span class="text-xs">⬅</span>
          </ToolBtn>
          <ToolBtn title={t("editor.align_center")} onMouseDown={() => exec("justifyCenter")}>
            <span class="text-xs">↔</span>
          </ToolBtn>
          <ToolBtn title={t("editor.clear_formatting")} onMouseDown={() => exec("removeFormat")}>
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
