import { createSignal, onMount } from "solid-js";

// ─── BBCode ↔ HTML conversion ────────────────────────────────────────────────

function htmlToBBCode(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;

  function convert(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";

    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    const inner = Array.from(el.childNodes).map(convert).join("");

    switch (tag) {
      case "b":
      case "strong":
        return `[b]${inner}[/b]`;
      case "i":
      case "em":
        return `[i]${inner}[/i]`;
      case "u":
        return `[u]${inner}[/u]`;
      case "s":
      case "strike":
      case "del":
        return `[s]${inner}[/s]`;
      case "code":
        return `[code]${inner}[/code]`;
      case "pre":
        return `[code]${el.textContent}[/code]`;
      case "blockquote":
        return `[quote]${inner}[/quote]`;
      case "a": {
        const href = el.getAttribute("href") ?? "";
        return `[url=${href}]${inner}[/url]`;
      }
      case "img": {
        const src = el.getAttribute("src") ?? "";
        return `[img]${src}[/img]`;
      }
      case "h1":
        return `[size=6]${inner}[/size]\n`;
      case "h2":
        return `[size=5]${inner}[/size]\n`;
      case "h3":
        return `[size=4]${inner}[/size]\n`;
      case "ul":
        return `[list]${inner}[/list]\n`;
      case "ol":
        return `[list=1]${inner}[/list]\n`;
      case "li":
        return `[*]${inner}\n`;
      case "br":
        return "\n";
      case "p":
        return inner + "\n";
      case "div":
        return inner + (inner.endsWith("\n") ? "" : "\n");
      case "span": {
        let result = inner;
        const color = el.style.color;
        if (color) result = `[color=${rgbToHex(color)}]${result}[/color]`;
        return result;
      }
      default:
        return inner;
    }
  }
  return convert(el).replace(/\n{3,}/g, "\n\n").trim();
}

function bbcodeToHtml(bb: string): string {
  let html = bb
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>")
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>")
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>")
    .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, "<s>$1</s>")
    .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, "<code>$1</code>")
    .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, "<blockquote>$1</blockquote>")
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1">$2</a>')
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '<a href="$1">$1</a>')
    .replace(/\[img\]([\s\S]*?)\[\/img\]/gi, '<img src="$1" />')
    .replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
    .replace(/\[size=(\d+)\]([\s\S]*?)\[\/size\]/gi, (_, n, t) => {
      const sizes: Record<string, string> = { "6": "2em", "5": "1.5em", "4": "1.25em", "3": "1em", "2": "0.875em", "1": "0.75em" };
      return `<span style="font-size:${sizes[n] ?? "1em"}">${t}</span>`;
    })
    .replace(/\[list=1\]([\s\S]*?)\[\/list\]/gi, (_, items) =>
      `<ol>${items.replace(/\[\*\](.*?)(?=\[\*\]|\[\/list\]|$)/gi, "<li>$1</li>")}</ol>`
    )
    .replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_, items) =>
      `<ul>${items.replace(/\[\*\](.*?)(?=\[\*\]|\[\/list\]|$)/gi, "<li>$1</li>")}</ul>`
    )
    .replace(/\n/g, "<br>");
  return html;
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return rgb;
  return "#" + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, "0")).join("");
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolBtn(props: { title: string; onClick: () => void; active?: boolean; children: any }) {
  return (
    <button
      type="button"
      title={props.title}
      onClick={props.onClick}
      class={`
        px-2 py-1.5 rounded text-sm font-medium transition-all duration-150 select-none
        ${props.active
          ? "bg-indigo-500 text-white shadow-inner"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}
      `}
    >
      {props.children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PostComposer(props: {
  /** Channel/user ID — maps to profile_uid in $_POST */
  profileUid: number;
  /** Parent item ID for replies; omit for top-level posts */
  parent?: number;
  /** jsreload path returned in the JSON response */
  jsreload?: string;
  /** Called after a successful post with the server JSON */
  onSuccess?: (json: { success: number; id: number; html: string }) => void;
  placeholder?: string;
}) {
  let editorRef!: HTMLDivElement;
  const [bbcode, setBBCode] = createSignal("");
  const [title, setTitle] = createSignal("");
  const [mode, setMode] = createSignal<"visual" | "source">("visual");
  const [submitting, setSubmitting] = createSignal(false);
  const [status, setStatus] = createSignal<"idle" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = createSignal("");
  const [linkUrl, setLinkUrl] = createSignal("");
  const [showLinkPop, setShowLinkPop] = createSignal(false);
  const [savedRange, setSavedRange] = createSignal<Range | null>(null);

  // Keep bbcode in sync when typing in visual mode
  const syncFromEditor = () => {
    if (mode() === "visual" && editorRef) {
      setBBCode(htmlToBBCode(editorRef.innerHTML));
    }
  };

  // When switching to source mode, source textarea shows bbcode
  // When switching back to visual mode, re-render
  const switchMode = (m: "visual" | "source") => {
    if (m === "source" && mode() === "visual") {
      syncFromEditor();
    }
    if (m === "visual" && mode() === "source") {
      if (editorRef) {
        editorRef.innerHTML = bbcodeToHtml(bbcode());
      }
    }
    setMode(m);
  };

  onMount(() => {
    editorRef.focus();
  });

  // ── Formatting commands ────────────────────────────────────────────────────

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) setSavedRange(sel.getRangeAt(0).cloneRange());
  };

  const restoreSelection = () => {
    const r = savedRange();
    if (!r) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.focus();
    document.execCommand(cmd, false, value);
    syncFromEditor();
  };


  const insertLink = () => {
    restoreSelection();
    const url = linkUrl().trim();
    if (!url) return;
    exec("createLink", url);
    setShowLinkPop(false);
    setLinkUrl("");
  };

  const insertImg = () => {
    const url = prompt("Image URL:");
    if (url) exec("insertImage", url);
  };

  // ── Colour picker shortcut ─────────────────────────────────────────────────

  let colorInputRef!: HTMLInputElement;
  const pickColor = () => {
    saveSelection();
    colorInputRef.click();
  };
  const applyColor = (e: Event) => {
    restoreSelection();
    exec("foreColor", (e.target as HTMLInputElement).value);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const submit = async () => {
    syncFromEditor();
    const body = bbcode().trim();
    if (!body) return;

    setSubmitting(true);
    setStatus("idle");
    setErrMsg("");

    try {
      const isReply = !!props.parent;

      const params = new URLSearchParams({
        body,
        mimetype: "text/bbcode",
        profile_uid: String(props.profileUid),
        // wall-comment for replies, wall for top-level posts
        type: isReply ? "wall-comment" : "wall",
        ...(title() ? { title: title() } : {}),
        ...(props.parent ? { parent: String(props.parent) } : {}),
        ...(props.jsreload ? { jsreload: props.jsreload } : {}),
      });

      const res = await fetch("/item", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });

      // /item always returns JSON when called via XHR (no return_path set)
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? `HTTP ${res.status}`);
      }

      setStatus("ok");
      if (editorRef) editorRef.innerHTML = "";
      setBBCode("");
      setTitle("");
      setTimeout(() => setStatus("idle"), 3000);
      props.onSuccess?.(json);
    } catch (e: unknown) {
      setStatus("err");
      setErrMsg(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="w-full max-w-2xl mx-auto">
      <div class="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">

        {/* ── Toolbar ── */}
        <div class="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">

          {/* Format group */}
          <ToolBtn title="Bold" onClick={() => exec("bold")}><b>B</b></ToolBtn>
          <ToolBtn title="Italic" onClick={() => exec("italic")}><i>I</i></ToolBtn>
          <ToolBtn title="Underline" onClick={() => exec("underline")}><u>U</u></ToolBtn>
          <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><s>S</s></ToolBtn>

          <span class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Heading */}
          <ToolBtn title="Heading" onClick={() => exec("formatBlock", "<h2>")}>H</ToolBtn>
          <ToolBtn title="Blockquote" onClick={() => exec("formatBlock", "<blockquote>")}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
            </svg>
          </ToolBtn>
          <ToolBtn title="Code" onClick={() => exec("formatBlock", "<pre>")}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
          </ToolBtn>

          <span class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Lists */}
          <ToolBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/>
              <line x1="9" y1="18" x2="20" y2="18"/>
              <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </ToolBtn>
          <ToolBtn title="Numbered list" onClick={() => exec("insertOrderedList")}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/>
              <line x1="10" y1="18" x2="21" y2="18"/>
              <text x="2" y="8" font-size="7" fill="currentColor" stroke="none">1</text>
              <text x="2" y="14" font-size="7" fill="currentColor" stroke="none">2</text>
              <text x="2" y="20" font-size="7" fill="currentColor" stroke="none">3</text>
            </svg>
          </ToolBtn>

          <span class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Link */}
          <div class="relative">
            <ToolBtn title="Insert link" onClick={() => { saveSelection(); setShowLinkPop(v => !v); }}>
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </ToolBtn>
            {showLinkPop() && (
              <div class="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 flex gap-1 min-w-48">
                <input
                  type="url"
                  placeholder="https://..."
                  value={linkUrl()}
                  onInput={e => setLinkUrl((e.target as HTMLInputElement).value)}
                  onKeyDown={e => e.key === "Enter" && insertLink()}
                  class="flex-1 text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-400 min-w-0"
                  autofocus
                />
                <button
                  type="button"
                  onClick={insertLink}
                  class="px-2 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 transition-colors"
                >OK</button>
              </div>
            )}
          </div>

          {/* Image */}
          <ToolBtn title="Insert image" onClick={insertImg}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </ToolBtn>

          {/* Colour */}
          <ToolBtn title="Text colour" onClick={pickColor}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l-8 20h4l2-5h4l2 5h4z"/>
            </svg>
          </ToolBtn>
          <input ref={colorInputRef!} type="color" class="sr-only" onInput={applyColor} />

          <span class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

          {/* Undo / Redo */}
          <ToolBtn title="Undo" onClick={() => exec("undo")}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/>
            </svg>
          </ToolBtn>
          <ToolBtn title="Redo" onClick={() => exec("redo")}>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 014-4h12"/>
            </svg>
          </ToolBtn>

          {/* Spacer */}
          <span class="flex-1" />

          {/* Mode toggle */}
          <div class="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 text-xs">
            <button
              type="button"
              onClick={() => switchMode("visual")}
              class={`px-2.5 py-1 transition-colors ${mode() === "visual"
                ? "bg-indigo-500 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            >Visual</button>
            <button
              type="button"
              onClick={() => switchMode("source")}
              class={`px-2.5 py-1 transition-colors border-l border-gray-300 dark:border-gray-600 ${mode() === "source"
                ? "bg-indigo-500 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            >BBCode</button>
          </div>
        </div>

        {/* ── Title (optional, top-level posts only) ── */}
        {!props.parent && (
          <div class="px-3 pt-3 pb-1">
            <input
              type="text"
              placeholder="Title (optional)"
              value={title()}
              onInput={e => setTitle((e.target as HTMLInputElement).value)}
              maxlength={191}
              class="w-full text-sm px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600
                     bg-transparent text-gray-900 dark:text-gray-100 outline-none
                     focus:border-indigo-400 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        )}

        {/* ── Editor area ── */}
        <div class="relative min-h-36">
          {/* Visual editor */}
          <div
            ref={editorRef!}
            contenteditable={mode() === "visual"}
            onInput={syncFromEditor}
            onClick={() => setShowLinkPop(false)}
            class={`
              min-h-36 p-3 outline-none text-sm text-gray-900 dark:text-gray-100
              prose prose-sm dark:prose-invert max-w-none
              [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-400 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_blockquote]:italic
              [&_code]:bg-gray-100 [&_code]:dark:bg-gray-700 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs
              [&_a]:text-indigo-500 [&_a]:underline
              [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4
              ${mode() === "source" ? "hidden" : "block"}
            `}
            style={{ "min-height": "9rem" }}
            data-placeholder={props.placeholder ?? (props.parent ? "Write a comment…" : "What's on your mind?")}
          />

          {/* BBCode source */}
          {mode() === "source" && (
            <textarea
              value={bbcode()}
              onInput={e => setBBCode((e.target as HTMLTextAreaElement).value)}
              class="w-full min-h-36 p-3 outline-none text-sm font-mono text-gray-900 dark:text-gray-100 bg-transparent resize-none"
              placeholder="BBCode source…"
              rows={6}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div class="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <div class="text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-xs">
            {bbcode() ? bbcode().slice(0, 60) + (bbcode().length > 60 ? "…" : "") : "empty"}
          </div>

          <div class="flex items-center gap-2">
            {status() === "ok" && (
              <span class="text-xs text-emerald-500 font-medium">Posted ✓</span>
            )}
            {status() === "err" && (
              <span class="text-xs text-red-500 font-medium" title={errMsg()}>Failed ✗{errMsg() ? ` — ${errMsg()}` : ""}</span>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting() || !bbcode().trim()}
              class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                     bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed
                     text-white shadow-sm"
            >
              {submitting() ? (
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                  <path d="M12 2a10 10 0 0110 10" />
                </svg>
              ) : (
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
              {submitting() ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder CSS */}
      <style>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
