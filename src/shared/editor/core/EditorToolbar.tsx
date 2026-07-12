import { createSignal, lazy, Show } from "solid-js";
import type { LatexInsertMode, ToolbarLevel } from "../types/editor.types";
import { useI18n } from "@/i18n";
import { MdOutlineLink, MdOutlineImage } from "solid-icons/md";

const LatexComposerModal = lazy(() => import("../latex/LatexComposerModal"));

interface Props {
  level: ToolbarLevel;
  latexMode: LatexInsertMode;
  tab: "wysiwyg" | "source";
  editorRef: () => HTMLDivElement | undefined;
  textareaRef: () => HTMLTextAreaElement | undefined;
  onSourceChange: (v: string) => void;
}

export default function EditorToolbar(props: Props) {
  const { t } = useI18n();
  const [latexOpen, setLatexOpen] = createSignal(false);

  const isSource  = () => props.tab === "source";
  const isWysiwyg = () => props.tab === "wysiwyg";
  const isComment = () => props.level === "comment";
  const isFull    = () => props.level === "full";

  // ── WYSIWYG helpers ──────────────────────────────────────────────────────

  const exec = (cmd: string, value?: string) => {
    const el = props.editorRef();
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, value);
  };

  const wrapHtml = (open: string, close: string) => {
    const el = props.editorRef();
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      document.execCommand("insertHTML", false, `${open}${close}`);
      return;
    }
    const frag = sel.getRangeAt(0).cloneContents();
    const tmp  = document.createElement("div");
    tmp.appendChild(frag);
    document.execCommand("insertHTML", false, `${open}${tmp.innerHTML}${close}`);
  };

  // ── Source helpers ───────────────────────────────────────────────────────

  const wrapSource = (open: string, close: string) => {
    const ta = props.textareaRef();
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e);
    props.onSourceChange(value.slice(0, s) + open + sel + close + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + open.length, s + open.length + sel.length);
    });
  };

  const insertSource = (text: string) => {
    const ta = props.textareaRef();
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    props.onSourceChange(value.slice(0, s) + text + value.slice(s));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + text.length, s + text.length);
    });
  };

  // ── Button actions (branch on tab for mode-aware behavior) ───────────────

  const bold      = () => isSource() ? wrapSource("[b]", "[/b]")   : exec("bold");
  const italic    = () => isSource() ? wrapSource("[i]", "[/i]")   : exec("italic");
  const underline = () => isSource() ? wrapSource("[u]", "[/u]")   : exec("underline");
  const highlight = () => isSource() ? wrapSource("[hl]", "[/hl]") : exec("hiliteColor", "yellow");

  const strike = () => {
    if (isSource()) { wrapSource("[s]", "[/s]"); return; }
    // execCommand("strikeThrough") doesn't reliably toggle off when inside <s>; unwrap manually
    const el = props.editorRef();
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node    = sel.getRangeAt(0).commonAncestorContainer;
    const parentEl = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    const sEl     = parentEl?.closest?.("s, strike");
    if (sEl && el.contains(sEl)) {
      const r = document.createRange();
      r.selectNode(sEl);
      sel.removeAllRanges();
      sel.addRange(r);
      document.execCommand("insertHTML", false, (sEl as HTMLElement).innerHTML);
    } else {
      exec("strikeThrough");
    }
  };

  const color = () => {
    const c = prompt("Color (name or #hex):", "red");
    if (!c) return;
    isSource() ? wrapSource(`[color=${c}]`, "[/color]") : exec("foreColor", c);
  };

  const font = () => {
    const f = prompt("Font name:", "courier");
    if (!f) return;
    isSource() ? wrapSource(`[font=${f}]`, "[/font]") : exec("fontName", f);
  };

  const size = () => {
    const s = prompt("Size (small, medium, large, xx-large):", "large");
    if (!s) return;
    if (isSource()) {
      wrapSource(`[size=${s}]`, "[/size]");
    } else {
      const map: Record<string, string> = {
        "xx-small": "1", "x-small": "1", "small": "2",
        "medium": "3", "large": "4", "x-large": "5", "xx-large": "6",
      };
      exec("fontSize", map[s] ?? "4");
    }
  };

  const quote = () => isSource() ? wrapSource("[quote]", "[/quote]") : exec("formatBlock", "blockquote");

  const quoteAuthor = () => {
    const a = prompt("Author name:");
    if (!a) return;
    if (isSource()) {
      wrapSource(`[quote=${a}]`, "[/quote]");
    } else {
      wrapHtml(`<span class="bb-quote">${a} wrote:</span><blockquote>`, "</blockquote>");
    }
  };

  const code = () => isSource() ? wrapSource("[code]", "[/code]") : exec("formatBlock", "pre");

  const hr = () => isSource() ? insertSource("[hr]\n") : exec("insertHorizontalRule");

  const link = () => {
    if (isSource()) {
      const u = prompt("URL:");
      if (!u) return;
      wrapSource(`[url=${u}]`, "[/url]");
      return;
    }
    // Save selection before prompt() steals focus and clears contenteditable selection
    const el  = props.editorRef();
    if (!el) return;
    const sel = window.getSelection();
    let savedRange: Range | null = null;
    if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
    const hasText = savedRange && !savedRange.collapsed;
    const url = prompt("URL:");
    if (!url) return;
    el.focus();
    if (savedRange) { sel!.removeAllRanges(); sel!.addRange(savedRange); }
    if (hasText) {
      document.execCommand("createLink", false, url);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.textContent = url;
      const tmp = document.createElement("div");
      tmp.appendChild(a);
      document.execCommand("insertHTML", false, tmp.innerHTML);
    }
  };

  const img = () => {
    const u = prompt("Image URL:");
    if (!u) return;
    isSource() ? insertSource(`[img]${u}[/img]`) : exec("insertImage", u);
  };

  const video = () => {
    const u = prompt("Video URL:");
    if (!u) return;
    if (isSource()) {
      insertSource(`[video]${u}[/video]`);
    } else {
      exec("insertHTML", `<video src="${u}" controls preload="none" style="max-width:100%"></video>`);
    }
  };

  const audio = () => {
    const u = prompt("Audio URL:");
    if (!u) return;
    if (isSource()) {
      insertSource(`[audio]${u}[/audio]`);
    } else {
      exec("insertHTML", `<audio src="${u}" controls preload="none"></audio>`);
    }
  };

  // The text/bbcode is built by LatexComposerModal (it knows inline vs.
  // block, and image vs. live mode); here we just splice it in, mirroring
  // how img()/video()/audio() insert raw bbcode for source and a real DOM
  // node for wysiwyg.
  const insertLatex = (text: string) => {
    if (isSource()) {
      insertSource(text);
      return;
    }
    if (props.latexMode === "live") {
      // Plain $…$ / $$…$$ text — rendered later by hydrateLatex() wherever
      // this content is displayed, so wysiwyg just gets the literal text.
      exec("insertText", text.trim());
      return;
    }
    const trimmed = text.trim();
    const isBlock = trimmed.startsWith("[center]");
    const inner = isBlock ? trimmed.slice("[center]".length, -"[/center]".length) : trimmed;
    const m = /^\[img alt="([^"]*)"\](.+)\[\/img\]$/s.exec(inner);
    if (!m) return;
    const [, alt, src] = m;
    const html = `<img src="${src}" alt="${alt}" />`;
    exec("insertHTML", isBlock ? `<div style="text-align:center">${html}</div>` : html);
  };

  const table = () => {
    const colsRaw = prompt("Number of columns:", "2");
    if (!colsRaw) return;
    const rowsRaw = prompt("Number of rows (excluding header):", "2");
    if (!rowsRaw) return;
    const cols = Math.max(1, parseInt(colsRaw, 10) || 2);
    const rows = Math.max(0, parseInt(rowsRaw, 10) || 2);
    if (isSource()) {
      const header   = "[tr]" + Array.from({ length: cols }, (_, i) => `[th]Header ${i + 1}[/th]`).join("") + "[/tr]";
      const dataRows = Array.from({ length: rows }, (_, r) =>
        "[tr]" + Array.from({ length: cols }, (_, c) => `[td]Cell ${r + 1}-${c + 1}[/td]`).join("") + "[/tr]"
      ).join("\n");
      insertSource(`[table border=1]\n${header}\n${dataRows}\n[/table]\n`);
    } else {
      const header   = "<tr>" + Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join("") + "</tr>";
      const dataRows = Array.from({ length: rows }, (_, r) =>
        "<tr>" + Array.from({ length: cols }, (_, c) => `<td>Cell ${r + 1}-${c + 1}</td>`).join("") + "</tr>"
      ).join("");
      exec("insertHTML", `<table border="1">${header}${dataRows}</table>`);
    }
  };

  const spoiler = () => {
    const label = prompt("Spoiler label (optional):", "") ?? "";
    const open  = label ? `[spoiler=${label}]` : "[spoiler]";
    if (isSource()) {
      wrapSource(open, "[/spoiler]");
    } else {
      wrapHtml(`<details><summary>${label || "Spoiler"}</summary><div>`, "</div></details>");
    }
  };

  return (
    <>
    <div class="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-surface border-b border-rim">

      {/* ── Group 1: Inline formatting — all levels ── */}
      <Btn title={t("editor.bold")} onPress={bold}>
        <span class="font-bold text-xs">B</span>
      </Btn>
      <Btn title={t("editor.italic")} onPress={italic}>
        <span class="italic text-xs">I</span>
      </Btn>
      <Btn title={t("editor.underline")} onPress={underline}>
        <span class="underline text-xs">U</span>
      </Btn>
      <Btn title={t("editor.strikethrough")} onPress={strike}>
        <span class="line-through text-xs">S</span>
      </Btn>
      <Btn title={t("editor.highlight")} onPress={highlight}>
        <span class="text-xs bg-yellow-300 text-yellow-900 px-0.5 rounded-sm leading-tight">H</span>
      </Btn>

      {/* ── Groups 2–7: hidden for comment level ── */}
      <Show when={!isComment()}>
        <>
          {/* ── Group 2: Text appearance ── */}
          <Sep />
          <Btn title="Text color [color=X]" onPress={color}>
            <span class="text-xs font-bold" style="color:#e74c3c;">A</span>
          </Btn>
          <Btn title="Font family [font=X]" onPress={font}>
            <span class="text-xs" style="font-family:serif;">F</span>
          </Btn>
          <Btn title="Font size [size=X]" onPress={size}>
            <span class="text-xs">Sz</span>
          </Btn>

          {/* ── Group 3: Block elements ── */}
          <Sep />
          {/* Heading selector — wysiwyg + full only (no BBCode heading tag support) */}
          <Show when={isFull() && isWysiwyg()}>
            <select
              title={t("editor.heading")}
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                const val = e.currentTarget.value;
                const el  = props.editorRef();
                if (!el) return;
                el.focus();
                document.execCommand("formatBlock", false, val);
                e.currentTarget.value = "p";
              }}
              class="text-xs rounded px-1 py-0.5 bg-surface border border-rim text-txt hover:bg-elevated transition-colors cursor-pointer"
            >
              <option value="p">{t("editor.heading_label")}</option>
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
              <option value="h5">H5</option>
              <option value="h6">H6</option>
            </select>
          </Show>
          <Btn title={t("editor.blockquote")} onPress={quote}>
            <span class="text-xs">❝</span>
          </Btn>
          <Show when={isFull()}>
            <>
              <Btn title="Quote with author [quote=Author]" onPress={quoteAuthor}>
                <span class="text-xs">❝A</span>
              </Btn>
              <Btn title={t("editor.code_block")} onPress={code}>
                <span class="text-xs font-mono">{"</>"}</span>
              </Btn>
            </>
          </Show>
          <Btn title="Horizontal rule [hr]" onPress={hr}>
            <span class="text-xs font-bold">—</span>
          </Btn>

          {/* ── Group 4: Lists — wysiwyg only (no BBCode list tag support) ── */}
          <Show when={isWysiwyg()}>
            <>
              <Sep />
              <Btn title={t("editor.bullet_list")} onPress={() => exec("insertUnorderedList")}>
                <span class="text-xs">• –</span>
              </Btn>
              <Btn title={t("editor.numbered_list")} onPress={() => exec("insertOrderedList")}>
                <span class="text-xs">1.</span>
              </Btn>
            </>
          </Show>

          {/* ── Group 5: Insert ── */}
          <Sep />
          <Btn title={t("editor.link")} onPress={link}>
            <MdOutlineLink class="w-4 h-4" />
          </Btn>
          <Btn title="Image [img]" onPress={img}>
            <MdOutlineImage class="w-4 h-4" />
          </Btn>
          <Btn title="Video [video]" onPress={video}>
            <span class="text-xs">▶</span>
          </Btn>
          <Btn title="Audio [audio]" onPress={audio}>
            <span class="text-xs">♪</span>
          </Btn>
          <Btn title={t("editor.latex_toolbar_title")} onPress={() => setLatexOpen(true)}>
            <span class="text-xs font-serif italic">∑</span>
          </Btn>

          {/* ── Group 6: Rich structure — full only ── */}
          <Show when={isFull()}>
            <>
              <Sep />
              <Btn title="Insert table [table]" onPress={table}>
                <span class="text-xs">⊞</span>
              </Btn>
              <Btn title="Spoiler [spoiler]" onPress={spoiler}>
                <span class="text-xs">◢</span>
              </Btn>
            </>
          </Show>

          {/* ── Group 7: Utility — full + wysiwyg only, pushed right ── */}
          <Show when={isFull() && isWysiwyg()}>
            <>
              <span class="flex-1" />
              <Btn
                title={t("editor.clear_formatting")}
                onPress={() => { exec("formatBlock", "p"); exec("removeFormat"); }}
              >
                <span class="text-xs">✕</span>
              </Btn>
            </>
          </Show>
        </>
      </Show>
    </div>
    <Show when={latexOpen()}>
      <LatexComposerModal
        mode={props.latexMode}
        onClose={() => setLatexOpen(false)}
        onInsert={insertLatex}
      />
    </Show>
    </>
  );
}

function Sep() {
  return <span class="w-px h-4 bg-rim mx-0.5 self-center" />;
}

function Btn(props: { title: string; onPress: () => void; children: any }) {
  return (
    <button
      type="button"
      title={props.title}
      onMouseDown={(e) => {
        e.preventDefault();
        props.onPress();
      }}
      class="px-1.5 py-0.5 rounded text-txt hover:bg-elevated transition-colors"
    >
      {props.children}
    </button>
  );
}
