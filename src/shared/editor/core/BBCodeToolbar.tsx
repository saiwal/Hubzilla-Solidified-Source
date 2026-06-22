import { MdOutlineLink, MdOutlineVpn_key, MdOutlineImage } from "solid-icons/md";

interface Props {
  textareaRef: () => HTMLTextAreaElement | undefined;
  editorRef: () => HTMLDivElement | undefined;
  tab: "wysiwyg" | "source" | "preview";
  onSourceChange: (v: string) => void;
}

export default function BBCodeToolbar(props: Props) {
  const isSource = () => props.tab === "source";

  // ── Source-tab helpers ──────────────────────────────────────────────────

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

  // ── Wysiwyg-tab helpers ─────────────────────────────────────────────────

  const exec = (cmd: string, value?: string) => {
    const el = props.editorRef();
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, value);
  };

  // Wraps the current wysiwyg selection in html open/close strings
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
    const tmp = document.createElement("div");
    tmp.appendChild(frag);
    document.execCommand("insertHTML", false, `${open}${tmp.innerHTML}${close}`);
  };

  // ── Button actions ──────────────────────────────────────────────────────

  const bold = () => isSource() ? wrapSource("[b]", "[/b]") : exec("bold");
  const italic = () => isSource() ? wrapSource("[i]", "[/i]") : exec("italic");
  const underline = () => isSource() ? wrapSource("[u]", "[/u]") : exec("underline");
  const strike = () => isSource() ? wrapSource("[s]", "[/s]") : exec("strikeThrough");
  const highlight = () => isSource() ? wrapSource("[hl]", "[/hl]") : exec("hiliteColor", "yellow");

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
    const s = prompt("Size — keyword (small, medium, large, xx-large) or pixels:", "large");
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

  const center = () => isSource() ? wrapSource("[center]", "[/center]") : exec("justifyCenter");
  const hr = () => isSource() ? insertSource("[hr]\n") : exec("insertHorizontalRule");
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

  const link = () => {
    const u = prompt("URL:");
    if (!u) return;
    isSource() ? wrapSource(`[url=${u}]`, "[/url]") : exec("createLink", u);
  };

  const zrl = () => {
    const u = prompt("URL (magic-auth link):");
    if (!u) return;
    // ZRL is BBCode-specific; in wysiwyg fall back to a regular link
    isSource() ? wrapSource(`[zrl=${u}]`, "[/zrl]") : exec("createLink", u);
  };

  const img = () => {
    const u = prompt("Image URL:");
    if (!u) return;
    isSource() ? insertSource(`[img]${u}[/img]`) : exec("insertImage", u);
  };

  const zmg = () => {
    const u = prompt("Image URL (magic-auth):");
    if (!u) return;
    isSource() ? insertSource(`[zmg]${u}[/zmg]`) : exec("insertImage", u);
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

  const table = () => {
    if (isSource()) {
      insertSource("[table border=1]\n[tr][th]Header 1[/th][th]Header 2[/th][/tr]\n[tr][td]Cell 1[/td][td]Cell 2[/td][/tr]\n[/table]\n");
    } else {
      exec("insertHTML", '<table border="1"><tr><th>Header 1</th><th>Header 2</th></tr><tr><td>Cell 1</td><td>Cell 2</td></tr></table>');
    }
  };

  const spoiler = () => {
    const label = prompt("Spoiler label (optional):", "") ?? "";
    const open = label ? `[spoiler=${label}]` : "[spoiler]";
    if (isSource()) {
      wrapSource(open, "[/spoiler]");
    } else {
      wrapHtml(`<details><summary>${label || "Spoiler"}</summary><div>`, "</div></details>");
    }
  };

  return (
    <div class="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-surface border-b border-rim border-dashed">
      <span class="text-[10px] text-muted mr-1 select-none font-mono">BBCode</span>

      {/* Basic formatting */}
      <Btn title="Bold [b]" onPress={bold}><strong class="text-xs">B</strong></Btn>
      <Btn title="Italic [i]" onPress={italic}><em class="text-xs">I</em></Btn>
      <Btn title="Underline [u]" onPress={underline}><span class="underline text-xs">U</span></Btn>
      <Btn title="Strikethrough [s]" onPress={strike}><span class="line-through text-xs">S</span></Btn>
      <Btn title="Highlight [hl]" onPress={highlight}>
        <span class="text-xs bg-yellow-300 text-yellow-900 px-0.5 rounded-sm leading-tight">HL</span>
      </Btn>

      <Sep />

      {/* Text styling */}
      <Btn title="Text color [color=X]" onPress={color}>
        <span class="text-xs font-bold" style="color:#e74c3c;">A</span>
      </Btn>
      <Btn title="Font family [font=X]" onPress={font}>
        <span class="text-xs" style="font-family:serif;">F</span>
      </Btn>
      <Btn title="Font size [size=X]" onPress={size}>
        <span class="text-xs">Sz</span>
      </Btn>

      <Sep />

      {/* Layout */}
      <Btn title="Center [center]" onPress={center}><span class="text-xs">⟺</span></Btn>
      <Btn title="Horizontal rule [hr]" onPress={hr}><span class="text-xs font-bold">—</span></Btn>
      <Btn title="Quote [quote]" onPress={quote}><span class="text-xs">❝</span></Btn>
      <Btn title="Quote with author [quote=Author]" onPress={quoteAuthor}><span class="text-xs">❝A</span></Btn>

      <Sep />

      {/* Links */}
      <Btn title="Link [url=X]" onPress={link}><MdOutlineLink class="w-4 h-4" /></Btn>
      <Btn title="Magic-auth link [zrl=X]" onPress={zrl}><MdOutlineVpn_key class="w-4 h-4" /></Btn>

      <Sep />

      {/* Media */}
      <Btn title="Image [img]" onPress={img}><MdOutlineImage class="w-4 h-4" /></Btn>
      <Btn title="Magic-auth image [zmg]" onPress={zmg}><span class="text-[10px] font-mono">zmg</span></Btn>
      <Btn title="Video [video]" onPress={video}><span class="text-xs">▶</span></Btn>
      <Btn title="Audio [audio]" onPress={audio}><span class="text-xs">♪</span></Btn>

      <Sep />

      {/* Structure */}
      <Btn title="Insert table [table]" onPress={table}><span class="text-xs">⊞</span></Btn>
      <Btn title="Spoiler [spoiler]" onPress={spoiler}><span class="text-xs">◢</span></Btn>
    </div>
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
