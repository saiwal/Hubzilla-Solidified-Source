/**
 * useMention.ts
 * Shared @-mention autocomplete hook for any text input surface.
 *
 * Works with both:
 *   - contenteditable (WYSIWYG) via Selection API
 *   - plain <textarea> via selectionStart
 *
 * The connections resource is created at module level so it is fetched once
 * and shared across every PostComposer + CommentComposer on the page — no
 * duplicate network requests.
 */

import { createSignal, createMemo, createResource } from "solid-js";
import { fetchConnections } from "@/modules/network/api/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MentionEntry {
  nick: string;
  name: string;
  /** Full federated address, e.g. "alice@example.com" */
  addr: string;
  photo?: string;
}

// ── Module-level connections cache ────────────────────────────────────────────
// createResource at module scope → fetched once, shared across all composers.

const [_connections] = createResource(fetchConnections);

function toMentionEntries(): MentionEntry[] {
  return (_connections() ?? [])
    .filter((c) => c.type === "c" && c.nick)
    .map((c) => ({
      nick: c.nick ?? "",
      name: c.name,
      addr: c.link
        ? c.link.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
        : (c.nick ?? ""),
      photo: c.photo,
    }));
}

// ── Caret utilities ───────────────────────────────────────────────────────────

/**
 * Returns the pixel rect of the current caret for popup anchoring.
 * Works inside a contenteditable; falls back to the container element.
 */
export function getCaretRect(): DOMRect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rects = range.getClientRects();
  if (rects.length) return rects[0];
  return (sel.focusNode?.parentElement?.getBoundingClientRect()) ?? null;
}

/**
 * Extracts the @-query fragment at the caret inside a contenteditable.
 * Returns null if the cursor is not actively inside an @-mention.
 */
export function getWysiwygMentionQuery(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const before = (node.textContent ?? "").slice(0, range.startOffset);
  const atIdx = before.lastIndexOf("@");
  if (atIdx === -1) return null;
  const fragment = before.slice(atIdx + 1);
  if (/\s/.test(fragment)) return null;
  return fragment;
}

/**
 * Same logic for a plain <textarea>, using selectionStart.
 */
export function getTextareaMentionQuery(ta: HTMLTextAreaElement): string | null {
  const before = ta.value.slice(0, ta.selectionStart);
  const atIdx = before.lastIndexOf("@");
  if (atIdx === -1) return null;
  const fragment = before.slice(atIdx + 1);
  if (/\s/.test(fragment)) return null;
  return fragment;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface MentionState {
  /** null = popup closed; string (possibly empty) = popup open, filtering by this */
  query: () => string | null;
  rect:  () => DOMRect | null;
  activeIdx: () => number;
  filtered: () => MentionEntry[];
  open: () => boolean;

  /** Call from a contenteditable onInput handler */
  onWysiwygInput: () => void;
  /** Call from a textarea onInput handler */
  onTextareaInput: (ta: HTMLTextAreaElement) => void;
  /**
   * Call from the keydown handler.
   * Returns true if the event was consumed (caller should return early).
   */
  onKeyDown: (e: KeyboardEvent) => boolean;

  /** Insert the selected entry via the contenteditable Selection API */
  insertWysiwyg: (entry: MentionEntry, syncBody: () => void) => void;
  /** Insert the selected entry into a plain textarea */
  insertTextarea: (
    entry: MentionEntry,
    ta: HTMLTextAreaElement,
    setBody: (v: string) => void,
  ) => void;

  /** Directly set query + anchor rect (for controlled inputs where we observe
   *  the body signal rather than a DOM input event) */
  openWithQuery: (q: string, rect: DOMRect) => void;
  close: () => void;
}

export function useMention(): MentionState {
  const allEntries = createMemo<MentionEntry[]>(toMentionEntries);

  const [query, setQuery]       = createSignal<string | null>(null);
  const [rect, setRect]         = createSignal<DOMRect | null>(null);
  const [activeIdx, setActiveIdx] = createSignal(0);

  const filtered = createMemo<MentionEntry[]>(() => {
    const q = query();
    if (q === null) return [];
    const lq = q.toLowerCase();
    const all = allEntries();
    if (!lq) return all.slice(0, 8);
    return all
      .filter(
        (e) =>
          e.nick.toLowerCase().includes(lq) ||
          e.name.toLowerCase().includes(lq) ||
          e.addr.toLowerCase().includes(lq),
      )
      .slice(0, 8);
  });

  const open = () => query() !== null && filtered().length > 0;

  function close() {
    setQuery(null);
    setRect(null);
    setActiveIdx(0);
  }

  function onWysiwygInput() {
    const q = getWysiwygMentionQuery();
    if (q !== null) {
      setQuery(q);
      setActiveIdx(0);
      const r = getCaretRect();
      if (r) setRect(r);
    } else {
      close();
    }
  }

  function onTextareaInput(ta: HTMLTextAreaElement) {
    const q = getTextareaMentionQuery(ta);
    if (q !== null) {
      setQuery(q);
      setActiveIdx(0);
      // Anchor to the textarea itself — best we can do without a virtual caret
      setRect(ta.getBoundingClientRect());
    } else {
      close();
    }
  }

  function onKeyDown(e: KeyboardEvent): boolean {
    if (!open()) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered().length - 1));
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      // Caller must still call its own action (e.g. submit on Enter) only
      // when we return false. We consume the event here.
      e.preventDefault();
      return true; // caller should call insertWysiwyg / insertTextarea
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return true;
    }
    return false;
  }

  function insertWysiwyg(entry: MentionEntry, syncBody: () => void) {
    const tag = `@${entry.addr}`;
    const sel = window.getSelection();
    const q = query() ?? "";
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.setStart(
        range.startContainer,
        Math.max(0, range.startOffset - q.length - 1),
      );
      range.deleteContents();
      const textNode = document.createTextNode(tag + "\u00A0");
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // Caller provides the sync callback (htmlToBb → setBody)
    setTimeout(syncBody, 0);
    close();
  }

  function insertTextarea(
    entry: MentionEntry,
    ta: HTMLTextAreaElement,
    setBody: (v: string) => void,
  ) {
    const tag = `@${entry.addr}`;
    const cursor = ta.selectionStart;
    const before = ta.value.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    const newVal =
      ta.value.slice(0, atIdx) + tag + " " + ta.value.slice(cursor);
    setBody(newVal);
    requestAnimationFrame(() => {
      const pos = atIdx + tag.length + 1;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
    close();
  }

  function openWithQuery(q: string, r: DOMRect) {
    setQuery(q);
    setRect(r);
    // Only reset index when the query prefix changes to avoid jumping
    // while the user is still typing within the same mention.
  }

  return {
    query,
    rect,
    activeIdx,
    filtered,
    open,
    onWysiwygInput,
    onTextareaInput,
    onKeyDown,
    insertWysiwyg,
    insertTextarea,
    openWithQuery,
    close,
  };
}
