/**
 * PostComposer.tsx
 * BBCode post composer modal for the Hubzilla SolidJS frontend.
 *
 * - Portal-mounted (always renders at document.body)
 * - Default tab: WYSIWYG contenteditable with live BBCode rendering
 * - Second tab: Source (raw BBCode textarea)
 * - Full toolbar: bold, italic, underline, strike, heading (H1–H3),
 *   ordered list, unordered list, hr, quote, code (block), inline code,
 *   spoiler, link, image, video, size, color, table, mention, hashtag
 * - Character count display
 * - ACL selector, expiry picker, collapsible extra fields
 * - Draft auto-save to localStorage
 * - Ctrl+Enter to post, Escape to close
 * - Submits to POST /item (Hubzilla Item::post())
 */

import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
  For,
  type Component,
} from "solid-js";
import { Portal } from "solid-js/web";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComposerProps {
  open: boolean;
  onClose: () => void;
  /** Hubzilla channel_id — required by Item::post() for ownership/permissions */
  profileUid: number;
  onPosted?: (itemId: number) => void;
  initialBody?: string;
  parentId?: number;
}

type AclValue = "public" | "connections" | "private";

// ─── BBCode ↔ HTML ────────────────────────────────────────────────────────────

/**
 * Converts BBCode to an HTML string suitable for innerHTML of the WYSIWYG div.
 * Each block/inline element carries a `data-bb` attribute that `htmlToBb` uses
 * to roundtrip back to BBCode losslessly.
 */
function bbToHtml(raw: string): string {
  let s = raw
    // Entity-escape so raw user text never becomes markup
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // ── Block-level (order matters: process before inline) ────────────────────
  // Headings
  s = s
    .replace(/\[h1\]([\s\S]*?)\[\/h1\]/gi, `<h1 data-bb="h1">$1</h1>`)
    .replace(/\[h2\]([\s\S]*?)\[\/h2\]/gi, `<h2 data-bb="h2">$1</h2>`)
    .replace(/\[h3\]([\s\S]*?)\[\/h3\]/gi, `<h3 data-bb="h3">$1</h3>`);

  // Lists — convert [list]/[list=1] + [*] items
  s = s.replace(
    /\[list=1\]([\s\S]*?)\[\/list\]/gi,
    (_m, inner) =>
      `<ol data-bb="ol">${inner.replace(/\[\*\]([\s\S]*?)(?=\[\*\]|\[\/list\]|$)/gi,
        (_m2: string, item: string) => `<li>${item.trim()}</li>`)}</ol>`
  );
  s = s.replace(
    /\[list\]([\s\S]*?)\[\/list\]/gi,
    (_m, inner) =>
      `<ul data-bb="ul">${inner.replace(/\[\*\]([\s\S]*?)(?=\[\*\]|\[\/list\]|$)/gi,
        (_m2: string, item: string) => `<li>${item.trim()}</li>`)}</ul>`
  );

  // Table
  s = s.replace(/\[table\]([\s\S]*?)\[\/table\]/gi, (_m, inner) => {
    const rows = inner.replace(
      /\[tr\]([\s\S]*?)\[\/tr\]/gi,
      (_mr: string, row: string) => {
        const cells = row.replace(
          /\[th\]([\s\S]*?)\[\/th\]/gi,
          (_mc: string, c: string) => `<th data-bb="th">${c}</th>`
        ).replace(
          /\[td\]([\s\S]*?)\[\/td\]/gi,
          (_mc: string, c: string) => `<td data-bb="td">${c}</td>`
        );
        return `<tr data-bb="tr">${cells}</tr>`;
      }
    );
    return `<table data-bb="table">${rows}</table>`;
  });

  // Code block (must come before inline code to avoid ambiguity)
  s = s.replace(
    /\[code\]([\s\S]*?)\[\/code\]/gi,
    `<pre data-bb="code"><code>$1</code></pre>`
  );

  // Quote & spoiler
  s = s
    .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi,
      `<blockquote data-bb="quote">$1</blockquote>`)
    .replace(/\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi,
      `<details data-bb="spoiler"><summary>Spoiler</summary>$1</details>`);

  // HR
  s = s.replace(/\[hr\]/gi, `<hr data-bb="hr" />`);

  // ── Inline ────────────────────────────────────────────────────────────────
  s = s
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi,        `<strong>$1</strong>`)
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi,         `<em>$1</em>`)
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi,         `<u>$1</u>`)
    .replace(/\[s\]([\s\S]*?)\[\/s\]/gi,         `<s>$1</s>`)
    .replace(/\[icode\]([\s\S]*?)\[\/icode\]/gi,
      `<code data-bb="icode">$1</code>`)
    .replace(/\[size=(\d+)\]([\s\S]*?)\[\/size\]/gi,
      `<span data-bb="size" data-size="$1" style="font-size:$1px">$2</span>`)
    .replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi,
      `<span data-bb="color" data-color="$1" style="color:$1">$2</span>`)
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi,
      `<a href="$1" data-bb="url" data-url="$1" target="_blank" rel="noopener">$2</a>`)
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi,
      `<a href="$1" data-bb="url-plain" target="_blank" rel="noopener">$1</a>`)
    .replace(/\[img\]([\s\S]*?)\[\/img\]/gi,
      `<img src="$1" data-bb="img" class="max-w-full rounded my-1" />`)
    .replace(/\[video\]([\s\S]*?)\[\/video\]/gi,
      `<video src="$1" data-bb="video" controls class="max-w-full my-1"></video>`);

  // Newlines → <br> (after all block replacements so they don't interfere)
  s = s.replace(/\n/g, "<br/>");

  return s;
}

/**
 * Walks the WYSIWYG DOM and serialises back to BBCode.
 * Called on submit and when switching to the Source tab.
 */
function htmlToBb(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el    = node as Element;
    const tag   = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join("");
    const bb    = el.getAttribute("data-bb");

    // ── data-bb roundtrip ──────────────────────────────────────────────────
    if (bb === "h1")         return `[h1]${inner}[/h1]\n`;
    if (bb === "h2")         return `[h2]${inner}[/h2]\n`;
    if (bb === "h3")         return `[h3]${inner}[/h3]\n`;
    if (bb === "ol") {
      const items = Array.from(el.querySelectorAll("li"))
        .map(li => `[*]${li.textContent ?? ""}`).join("\n");
      return `[list=1]\n${items}\n[/list]\n`;
    }
    if (bb === "ul") {
      const items = Array.from(el.querySelectorAll("li"))
        .map(li => `[*]${li.textContent ?? ""}`).join("\n");
      return `[list]\n${items}\n[/list]\n`;
    }
    if (bb === "table") {
      const rows = Array.from(el.querySelectorAll("tr")).map(tr => {
        const cells = Array.from(tr.children).map(cell => {
          const t = cell.tagName.toLowerCase();
          return t === "th" ? `[th]${cell.textContent}[/th]` : `[td]${cell.textContent}[/td]`;
        }).join("");
        return `[tr]${cells}[/tr]`;
      }).join("\n");
      return `[table]\n${rows}\n[/table]\n`;
    }
    if (bb === "code")       return `[code]${inner}[/code]\n`;
    if (bb === "icode")      return `[icode]${inner}[/icode]`;
    if (bb === "quote")      return `[quote]${inner}[/quote]\n`;
    if (bb === "spoiler")    return `[spoiler]${inner}[/spoiler]\n`;
    if (bb === "hr")         return `[hr]\n`;
    if (bb === "url") {
      const url = el.getAttribute("data-url") ?? el.getAttribute("href") ?? "";
      return `[url=${url}]${inner}[/url]`;
    }
    if (bb === "url-plain")  return `[url]${inner}[/url]`;
    if (bb === "img")        return `[img]${el.getAttribute("src") ?? ""}[/img]`;
    if (bb === "video")      return `[video]${el.getAttribute("src") ?? ""}[/video]`;
    if (bb === "size") {
      const sz = el.getAttribute("data-size") ?? "";
      return `[size=${sz}]${inner}[/size]`;
    }
    if (bb === "color") {
      const col = el.getAttribute("data-color") ?? "";
      return `[color=${col}]${inner}[/color]`;
    }

    // ── execCommand-generated / browser-native elements ────────────────────
    if (tag === "strong" || tag === "b") return `[b]${inner}[/b]`;
    if (tag === "em"     || tag === "i") return `[i]${inner}[/i]`;
    if (tag === "u")                     return `[u]${inner}[/u]`;
    if (tag === "s" || tag === "strike" || tag === "del") return `[s]${inner}[/s]`;
    if (tag === "code")                  return `[icode]${inner}[/icode]`;
    if (tag === "br")                    return "\n";
    if (tag === "p")                     return inner + "\n";
    if (tag === "div")                   return inner + (inner.endsWith("\n") ? "" : "\n");
    if (tag === "h1")                    return `[h1]${inner}[/h1]\n`;
    if (tag === "h2")                    return `[h2]${inner}[/h2]\n`;
    if (tag === "h3")                    return `[h3]${inner}[/h3]\n`;
    if (tag === "ul") {
      const items = Array.from(el.children).map(li => `[*]${walk(li)}`).join("\n");
      return `[list]\n${items}\n[/list]\n`;
    }
    if (tag === "ol") {
      const items = Array.from(el.children).map(li => `[*]${walk(li)}`).join("\n");
      return `[list=1]\n${items}\n[/list]\n`;
    }
    if (tag === "li") return inner; // handled by ul/ol above
    if (tag === "blockquote") return `[quote]${inner}[/quote]\n`;
    if (tag === "pre")        return `[code]${inner}[/code]\n`;
    if (tag === "hr")         return `[hr]\n`;
    if (tag === "a") {
      const href = el.getAttribute("href") ?? "";
      return inner === href ? `[url]${href}[/url]` : `[url=${href}]${inner}[/url]`;
    }
    if (tag === "img")        return `[img]${el.getAttribute("src") ?? ""}[/img]`;
    if (tag === "details")    return `[spoiler]${inner}[/spoiler]\n`;
    if (tag === "summary")    return ""; // swallowed by details

    return inner;
  }

  return Array.from(tmp.childNodes).map(walk).join("").replace(/\n+$/, "");
}

// ─── WYSIWYG helpers ──────────────────────────────────────────────────────────

/** Insert an HTML fragment at the current cursor in a contenteditable. */
function insertHtmlAtCursor(html: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const frag = range.createContextualFragment(html);
  const last = frag.lastChild;
  range.insertNode(frag);
  if (last) {
    range.setStartAfter(last);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/** Wrap the current WYSIWYG selection in an HTML tag, or insert with placeholder. */
function wrapSelection(openTag: string, closeTag: string, placeholder = "…") {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const selected = sel.toString();
  const inner = selected || placeholder;
  // We use insertHTML so the browser handles undo/redo correctly
  document.execCommand("insertHTML", false, openTag + inner + closeTag);
}

// ─── Toolbar config ───────────────────────────────────────────────────────────

type InsertBbFn = (open: string, close: string, defaultText?: string) => void;

interface ToolbarItem {
  title: string;
  icon: string;
  labelClass?: string;
  /** divider before this item */
  divider?: boolean;
  /** execCommand id for WYSIWYG (simple inline formatting only) */
  cmd?: string;
  /** BBCode tag for source mode (and WYSIWYG block/wrap fallback) */
  tag?: string;
  block?: boolean;
  /** Fully custom handler for both modes */
  action?: (
    mode: "wysiwyg" | "source",
    insertBb: InsertBbFn,
  ) => void;
}

const TOOLBAR: ToolbarItem[] = [
  // ── Inline formatting ──────────────────────────────────────────────────────
  { title: "Bold",          icon: "B",     cmd: "bold",          tag: "b",  labelClass: "font-bold" },
  { title: "Italic",        icon: "I",     cmd: "italic",        tag: "i",  labelClass: "italic" },
  { title: "Underline",     icon: "U",     cmd: "underline",     tag: "u",  labelClass: "underline" },
  { title: "Strikethrough", icon: "S",     cmd: "strikeThrough", tag: "s",  labelClass: "line-through" },

  // ── Headings ───────────────────────────────────────────────────────────────
  { title: "Heading 1", icon: "H1", tag: "h1", divider: true,
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        wrapSelection(`<h1 data-bb="h1">`, "</h1>");
      } else {
        insertBb("[h1]", "[/h1]", "Heading");
      }
    },
  },
  { title: "Heading 2", icon: "H2", tag: "h2",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        wrapSelection(`<h2 data-bb="h2">`, "</h2>");
      } else {
        insertBb("[h2]", "[/h2]", "Heading");
      }
    },
  },
  { title: "Heading 3", icon: "H3", tag: "h3",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        wrapSelection(`<h3 data-bb="h3">`, "</h3>");
      } else {
        insertBb("[h3]", "[/h3]", "Heading");
      }
    },
  },

  // ── Lists ──────────────────────────────────────────────────────────────────
  { title: "Unordered list", icon: "• —", tag: "list", divider: true,
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        insertHtmlAtCursor(
          `<ul data-bb="ul"><li>Item</li></ul>`
        );
      } else {
        insertBb("[list]\n[*]", "\n[/list]", "Item");
      }
    },
  },
  { title: "Ordered list", icon: "1. —", tag: "list=1",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        insertHtmlAtCursor(
          `<ol data-bb="ol"><li>Item</li></ol>`
        );
      } else {
        insertBb("[list=1]\n[*]", "\n[/list]", "Item");
      }
    },
  },

  // ── Blocks ─────────────────────────────────────────────────────────────────
  { title: "Quote",   icon: "❝",   tag: "quote",   block: true, divider: true,
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        wrapSelection(`<blockquote data-bb="quote">`, `</blockquote>`);
      } else {
        insertBb("[quote]\n", "\n[/quote]");
      }
    },
  },
  { title: "Code block", icon: "</>", tag: "code",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        // insertHTML for <pre> — execCommand("formatBlock") is unreliable
        const sel = window.getSelection();
        const text = sel?.toString() || "code here";
        insertHtmlAtCursor(
          `<pre data-bb="code"><code>${text}</code></pre>`
        );
      } else {
        insertBb("[code]\n", "\n[/code]", "code here");
      }
    },
  },
  { title: "Inline code", icon: "`…`", tag: "icode",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        wrapSelection(`<code data-bb="icode">`, `</code>`);
      } else {
        insertBb("[icode]", "[/icode]");
      }
    },
  },
  { title: "Spoiler", icon: "⚠", tag: "spoiler",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        const sel = window.getSelection();
        const text = sel?.toString() || "hidden content";
        insertHtmlAtCursor(
          `<details data-bb="spoiler"><summary>Spoiler</summary>${text}</details>`
        );
      } else {
        insertBb("[spoiler]\n", "\n[/spoiler]");
      }
    },
  },
  { title: "Horizontal rule", icon: "—",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        insertHtmlAtCursor(`<hr data-bb="hr" />`);
      } else {
        insertBb("[hr]", "", "");
      }
    },
  },

  // ── Media / links ──────────────────────────────────────────────────────────
  { title: "Link", icon: "🔗", divider: true,
    action: (mode, insertBb) => {
      const url = window.prompt("URL:", "https://");
      if (!url) return;
      if (mode === "wysiwyg") {
        const sel = window.getSelection();
        const text = sel?.toString() || url;
        insertHtmlAtCursor(
          `<a href="${url}" data-bb="url" data-url="${url}" target="_blank" rel="noopener">${text}</a>`
        );
      } else {
        const sel = document.querySelector<HTMLTextAreaElement>("#hz-source-ta");
        const selText = sel ? sel.value.slice(sel.selectionStart, sel.selectionEnd) : "";
        selText ? insertBb(`[url=${url}]`, "[/url]") : insertBb("[url]", "[/url]", url);
      }
    },
  },
  { title: "Image", icon: "🖼",
    action: (mode, insertBb) => {
      const url = window.prompt("Image URL:", "https://");
      if (!url) return;
      if (mode === "wysiwyg") {
        insertHtmlAtCursor(`<img src="${url}" data-bb="img" class="max-w-full rounded my-1" />`);
      } else {
        insertBb("[img]", "[/img]", url);
      }
    },
  },
  { title: "Video", icon: "▶",
    action: (mode, insertBb) => {
      const url = window.prompt("Video URL:", "https://");
      if (!url) return;
      if (mode === "wysiwyg") {
        insertHtmlAtCursor(`<video src="${url}" data-bb="video" controls class="max-w-full my-1"></video>`);
      } else {
        insertBb("[video]", "[/video]", url);
      }
    },
  },

  // ── Decoration ─────────────────────────────────────────────────────────────
  { title: "Text size", icon: "Aa", divider: true,
    action: (mode, insertBb) => {
      const size = window.prompt("Font size in px (e.g. 18):", "18");
      if (!size || isNaN(Number(size))) return;
      if (mode === "wysiwyg") {
        wrapSelection(
          `<span data-bb="size" data-size="${size}" style="font-size:${size}px">`,
          `</span>`
        );
      } else {
        insertBb(`[size=${size}]`, "[/size]");
      }
    },
  },
  { title: "Text color", icon: "A🎨",
    action: (mode, insertBb) => {
      const color = window.prompt("Color (name or #hex):", "#e74c3c");
      if (!color) return;
      if (mode === "wysiwyg") {
        wrapSelection(
          `<span data-bb="color" data-color="${color}" style="color:${color}">`,
          `</span>`
        );
      } else {
        insertBb(`[color=${color}]`, "[/color]");
      }
    },
  },

  // ── Table ──────────────────────────────────────────────────────────────────
  { title: "Table", icon: "⊞", divider: true,
    action: (mode, insertBb) => {
      const rows = parseInt(window.prompt("Rows:", "2") ?? "2", 10) || 2;
      const cols = parseInt(window.prompt("Columns:", "2") ?? "2", 10) || 2;
      if (mode === "wysiwyg") {
        const trs = Array.from({ length: rows }, (_, r) => {
          const tds = Array.from({ length: cols }, (_, c) =>
            `<td data-bb="td">${r === 0 ? `Header ${c + 1}` : `Cell ${r},${c + 1}`}</td>`
          ).join("");
          return `<tr data-bb="tr">${tds}</tr>`;
        }).join("");
        insertHtmlAtCursor(`<table data-bb="table">${trs}</table>`);
      } else {
        const trs = Array.from({ length: rows }, (_, r) => {
          const tds = Array.from({ length: cols }, (_, c) =>
            `[td]${r === 0 ? `Header ${c + 1}` : `Cell ${r},${c + 1}`}[/td]`
          ).join("");
          return `[tr]${tds}[/tr]`;
        }).join("\n");
        insertBb(`[table]\n${trs}\n`, `[/table]`, "");
      }
    },
  },

  // ── Social ─────────────────────────────────────────────────────────────────
  { title: "Mention", icon: "@", divider: true,
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        insertHtmlAtCursor("@nick@domain");
      } else {
        insertBb("@", "", "nick@domain");
      }
    },
  },
  { title: "Hashtag", icon: "#",
    action: (mode, insertBb) => {
      if (mode === "wysiwyg") {
        insertHtmlAtCursor("#tag");
      } else {
        insertBb("#", "", "tag");
      }
    },
  },
];

// ─── ACL options ──────────────────────────────────────────────────────────────

const ACL_OPTIONS: Array<{ label: string; value: AclValue; icon: string }> = [
  { label: "Public",      value: "public",      icon: "🌐" },
  { label: "Connections", value: "connections", icon: "🔒" },
  { label: "Private",     value: "private",     icon: "🤫" },
];

// ─── Draft helpers ────────────────────────────────────────────────────────────

const DRAFT_KEY = "hz_composer_draft";
function loadDraft(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") as Record<string, string>; }
  catch { return {}; }
}
function saveDraft(data: object) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /**/ } }
function clearDraft()            { try { localStorage.removeItem(DRAFT_KEY); }                   catch { /**/ } }

// ─── Component ────────────────────────────────────────────────────────────────

const PostComposer: Component<ComposerProps> = (props) => {
  const draft = loadDraft();

  const [title,      setTitle]      = createSignal(draft.title    ?? "");
  const [summary,    setSummary]    = createSignal(draft.summary   ?? "");
  const [category,   setCategory]   = createSignal(draft.category ?? "");
  const [body,       setBody]       = createSignal(props.initialBody ?? draft.body ?? "");
  const [acl,        setAcl]        = createSignal<AclValue>((draft.acl as AclValue) ?? "public");
  const [expiry,     setExpiry]     = createSignal("");
  const [tab,        setTab]        = createSignal<"wysiwyg" | "source">("wysiwyg");
  const [fullscreen, setFullscreen] = createSignal(false);
  const [showExtra,  setShowExtra]  = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [error,      setError]      = createSignal("");

  // Character count — derived from the body BBCode signal
  const charCount = () => body().length;

  let editorRef!:   HTMLDivElement;
  let textareaRef!: HTMLTextAreaElement;

  // ── WYSIWYG ↔ body sync ────────────────────────────────────────────────────

  // When switching TO wysiwyg, re-render the WYSIWYG from body signal
  createEffect(() => {
    if (tab() === "wysiwyg" && editorRef) {
      const html = bbToHtml(body());
      if (editorRef.innerHTML !== html) editorRef.innerHTML = html;
    }
  });

  function handleTabChange(next: "wysiwyg" | "source") {
    if (next === "source" && tab() === "wysiwyg" && editorRef) {
      setBody(htmlToBb(editorRef.innerHTML));
    }
    setTab(next);
  }

  // Flush on every input in WYSIWYG so the char counter stays live
  function onEditorInput() {
    if (editorRef) setBody(htmlToBb(editorRef.innerHTML));
  }

  // ── Draft auto-save ────────────────────────────────────────────────────────
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const snap = { title: title(), summary: summary(), category: category(), body: body(), acl: acl() };
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => saveDraft(snap), 800);
  });
  onCleanup(() => clearTimeout(draftTimer));

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") { props.onClose(); return; }
    if (e.ctrlKey && e.key === "Enter") { void handleSubmit(); }
  }
  createEffect(() => {
    if (props.open) window.addEventListener("keydown", onKey);
    else            window.removeEventListener("keydown", onKey);
  });
  onCleanup(() => window.removeEventListener("keydown", onKey));

  // ── BBCode insert helper (source tab) ──────────────────────────────────────
  function insertBb(open: string, close: string, defaultText = "") {
    const ta    = textareaRef;
    if (!ta) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = ta.value.slice(start, end) || defaultText;
    const next  = ta.value.slice(0, start) + open + sel + close + ta.value.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + open.length + sel.length + close.length,
                           start + open.length + sel.length + close.length);
    });
  }

  // ── Toolbar dispatch ───────────────────────────────────────────────────────
  function handleToolbar(item: ToolbarItem) {
    const mode = tab();

    if (item.action) {
      item.action(mode, insertBb);
      return;
    }

    // Simple inline cmd (bold/italic/underline/strike) — WYSIWYG
    if (mode === "wysiwyg" && item.cmd) {
      document.execCommand(item.cmd, false);
      return;
    }

    // Source fallback for items that only have tag + block
    if (mode === "source" && item.tag) {
      item.block
        ? insertBb(`[${item.tag}]\n`, `\n[/${item.tag}]`)
        : insertBb(`[${item.tag}]`,   `[/${item.tag}]`);
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    // Flush WYSIWYG to body before reading
    if (tab() === "wysiwyg" && editorRef) setBody(htmlToBb(editorRef.innerHTML));

    if (!body().trim()) { setError("Post body is required."); return; }
    setError("");
    setSubmitting(true);

    const fd = new FormData();
    fd.append("body",          body());
    fd.append("title",         title());
    fd.append("summary",       summary());
    fd.append("category",      category());
    fd.append("mimetype",      "text/bbcode");
    fd.append("obj_type",      "Note");
    fd.append("profile_uid",   String(props.profileUid));
    fd.append("type",          props.parentId ? "net-comment" : "wall");
    if (props.parentId) fd.append("parent", String(props.parentId));
    fd.append("contact_allow", "");
    fd.append("group_allow",   "");
    fd.append("contact_deny",  "");
    fd.append("group_deny",    "");
    if (expiry()) fd.append("expire", expiry());
    fd.append("return", "");

    try {
      const res = await fetch("/item", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => ({})) as { success?: number; cancel?: number; id?: number };
      if (json.cancel)    { setError("Post cancelled by server (duplicate or plugin)."); return; }
      if (!json.success)  { setError("Server reported failure. Check Hubzilla logs."); return; }

      clearDraft();
      setBody(""); setTitle(""); setSummary(""); setCategory("");
      if (editorRef) editorRef.innerHTML = "";
      props.onPosted?.(json.id ?? 0);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Show when={props.open}>
      <Portal mount={document.body}>
        {/* Backdrop */}
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
        >
          {/* Dialog */}
          <div
            class={
              "flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 " +
              "shadow-2xl text-gray-900 dark:text-gray-100 overflow-hidden " +
              (fullscreen()
                ? "fixed inset-0 w-full max-h-full rounded-none"
                : "w-full max-w-2xl max-h-[90vh] rounded-xl")
            }
            role="dialog"
            aria-modal="true"
            aria-label="Post composer"
          >

            {/* ── Header ── */}
            <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <span class="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 select-none">
                {props.parentId ? "Reply" : "New Post"}
              </span>
              <div class="flex items-center gap-1">
                <button type="button" title={fullscreen() ? "Exit fullscreen" : "Fullscreen"}
                  onClick={() => setFullscreen(f => !f)}
                  class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Show when={fullscreen()} fallback={
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  }>
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  </Show>
                </button>
                <button type="button" title="Close (Esc)" onClick={props.onClose}
                  class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </header>

            {/* ── Tab bar ── */}
            <div class="flex items-center px-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              {(["wysiwyg", "source"] as const).map(t => (
                <button type="button" onClick={() => handleTabChange(t)}
                  class={
                    "px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors " +
                    (tab() === t
                      ? "border-indigo-500 text-indigo-500 dark:text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")
                  }
                >
                  {t === "wysiwyg" ? "Write" : "Source"}
                </button>
              ))}
              <div class="flex-1" />
              <button type="button" onClick={() => setShowExtra(v => !v)}
                class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-2.5 px-1 select-none"
              >
                {showExtra() ? "▲ Less" : "▼ More fields"}
              </button>
            </div>

            {/* ── Extra fields ── */}
            <Show when={showExtra()}>
              <div class="flex flex-col border-b border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 shrink-0">
                {(
                  [
                    { placeholder: "Title (optional)",              value: title,    set: setTitle },
                    { placeholder: "Summary / abstract (optional)", value: summary,  set: setSummary },
                    { placeholder: "Categories (comma-separated)",  value: category, set: setCategory },
                  ] as const
                ).map(f => (
                  <input
                    class="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800/50 transition-colors"
                    placeholder={f.placeholder}
                    value={f.value()}
                    onInput={e => f.set(e.currentTarget.value)}
                  />
                ))}
              </div>
            </Show>

            {/* ── Content area ── */}
            <div class="flex flex-col flex-1 overflow-hidden min-h-0">

              {/* Toolbar */}
              <div role="toolbar" aria-label="Formatting"
                class="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0"
              >
                <For each={TOOLBAR}>
                  {(item) => (
                    <>
                      <Show when={item.divider}>
                        <div class="w-px self-stretch bg-gray-200 dark:bg-gray-700 mx-0.5" />
                      </Show>
                      <button
                        type="button"
                        title={item.title}
                        onMouseDown={(e) => { e.preventDefault(); handleToolbar(item); }}
                        class="min-w-[28px] px-1.5 py-1 rounded text-xs font-mono font-medium text-gray-500 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100 transition-all text-center whitespace-nowrap"
                      >
                        <span class={item.labelClass ?? ""}>{item.icon}</span>
                      </button>
                    </>
                  )}
                </For>
              </div>

              {/* WYSIWYG editor */}
              <div
                ref={editorRef!}
                id="hz-wysiwyg-editor"
                contenteditable={tab() === "wysiwyg" ? "true" : "false"}
                onInput={onEditorInput}
                class={
                  "flex-1 overflow-y-auto px-4 py-3.5 text-sm leading-relaxed " +
                  "text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 " +
                  "focus:outline-none min-h-[180px] transition-colors " +
                  // Prose element styles (arbitrary variants, Tailwind v4 compatible)
                  "[&_strong]:font-bold [&_em]:italic [&_u]:underline [&_s]:line-through " +
                  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:my-2 " +
                  "[&_h2]:text-xl  [&_h2]:font-bold [&_h2]:my-2 " +
                  "[&_h3]:text-lg  [&_h3]:font-semibold [&_h3]:my-1.5 " +
                  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 " +
                  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 " +
                  "[&_li]:my-0.5 " +
                  "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:dark:border-gray-600 " +
                  "[&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-gray-500 [&_blockquote]:dark:text-gray-400 " +
                  "[&_pre]:bg-gray-100 [&_pre]:dark:bg-gray-800 [&_pre]:rounded [&_pre]:p-2.5 [&_pre]:my-2 " +
                  "[&_pre]:font-mono [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:whitespace-pre " +
                  "[&_code]:bg-gray-100 [&_code]:dark:bg-gray-800 [&_code]:rounded [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs " +
                  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
                  "[&_a]:text-indigo-500 [&_a]:underline " +
                  "[&_hr]:border-gray-300 [&_hr]:dark:border-gray-600 [&_hr]:my-3 " +
                  "[&_details]:bg-gray-50 [&_details]:dark:bg-gray-800/60 [&_details]:rounded [&_details]:p-2 [&_details]:my-1 " +
                  "[&_summary]:cursor-pointer [&_summary]:text-gray-500 [&_summary]:select-none " +
                  "[&_table]:border-collapse [&_table]:w-full [&_table]:my-2 " +
                  "[&_td]:border [&_td]:border-gray-300 [&_td]:dark:border-gray-600 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs " +
                  "[&_th]:border [&_th]:border-gray-300 [&_th]:dark:border-gray-600 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_th]:font-semibold [&_th]:bg-gray-100 [&_th]:dark:bg-gray-700 " +
                  (tab() === "wysiwyg" ? "block" : "hidden")
                }
                spellcheck={true}
              />

              {/* Source textarea */}
              <textarea
                ref={textareaRef!}
                id="hz-source-ta"
                class={
                  "flex-1 resize-none px-4 py-3.5 bg-white dark:bg-gray-900 " +
                  "text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed " +
                  "placeholder:text-gray-400 dark:placeholder:text-gray-600 " +
                  "focus:outline-none transition-colors min-h-[180px] " +
                  (tab() === "source" ? "block" : "hidden")
                }
                placeholder="BBCode source — Ctrl+Enter to post."
                value={body()}
                onInput={(e) => setBody(e.currentTarget.value)}
                spellcheck={false}
              />
            </div>

            {/* ── Footer ── */}
            <footer class="flex flex-wrap items-center gap-2 px-3.5 py-2.5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 shrink-0">

              {/* ACL */}
              <div class="flex items-center gap-1 shrink-0">
                <For each={ACL_OPTIONS}>
                  {(opt) => (
                    <button type="button" title={opt.label} onClick={() => setAcl(opt.value)}
                      class={
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all " +
                        (acl() === opt.value
                          ? "border-indigo-400 text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                          : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-600 dark:hover:text-gray-300")
                      }
                    >
                      <span>{opt.icon}</span>
                      <span class="hidden sm:inline">{opt.label}</span>
                    </button>
                  )}
                </For>
              </div>

              {/* Expiry */}
              <div class="hidden sm:flex items-center gap-1.5 min-w-0">
                <span class="text-gray-400 dark:text-gray-500 text-xs shrink-0" title="Post expiry">⏱</span>
                <input
                  type="datetime-local"
                  value={expiry()}
                  onInput={(e) => setExpiry(e.currentTarget.value)}
                  class="bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:text-gray-700 dark:focus:text-gray-300 transition-colors"
                />
              </div>

              {/* Character count + submit */}
              <div class="flex items-center gap-3 ml-auto shrink-0">
                <span class="font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
                  {charCount()}
                </span>
                <button
                  type="button"
                  disabled={submitting()}
                  onClick={handleSubmit}
                  class="px-5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {submitting() ? "Posting…" : "Post"}
                </button>
              </div>
            </footer>

            {/* Error */}
            <Show when={error()}>
              <div class="px-4 py-2 text-sm text-red-500 bg-red-500/10 border-t border-red-500/30 shrink-0">
                {error()}
              </div>
            </Show>

          </div>
        </div>
      </Portal>
    </Show>
  );
};

export default PostComposer;
