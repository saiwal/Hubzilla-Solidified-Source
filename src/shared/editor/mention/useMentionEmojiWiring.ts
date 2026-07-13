/**
 * useMentionEmojiWiring.ts
 * Shared glue between the mention (@) and emoji (:) autocomplete hooks and a
 * composer's editing surface (contenteditable WYSIWYG or plain textarea).
 *
 * Centralizes what was previously copy-pasted per composer: locating the
 * active surface inside a wrapper ref, watching the body for an active
 * @-/:-query to open/close the right popup, and dispatching an insert into
 * whichever surface currently has the query.
 */

import { createEffect } from "solid-js";
import {
  useMention,
  getWysiwygMentionQuery,
  getTextareaMentionQuery,
  getCaretRect,
  type MentionState,
  type MentionEntry,
} from "./useMention";
import {
  useEmoji,
  getWysiwygEmojiQuery,
  getTextareaEmojiQuery,
  type EmojiState,
  type EmojiEntry,
} from "../emoji/useEmoji";
import { htmlToSource } from "../core/htmlToSource";
import type { MimeType } from "../types/editor.types";

export interface MentionEmojiWiringOptions {
  body: () => string;
  setBody: (v: string) => void;
  mimetype: () => MimeType;
}

export interface MentionEmojiWiring {
  mention: MentionState;
  emoji: EmojiState;
  /** Attach to the div wrapping the RichEditor (+ AttachmentBar). */
  wrapperRef: (el: HTMLDivElement) => void;
  /** Insert the given (or currently-active) mention into whichever surface has focus. */
  selectMention: (entry?: MentionEntry) => void;
  /** Insert the given (or currently-active) emoji into whichever surface has focus. */
  selectEmoji: (entry?: EmojiEntry) => void;
  /**
   * Keydown handler for mention/emoji navigation + Enter/Tab-to-insert +
   * Escape-to-close. Returns true if the event was consumed — callers should
   * return early (not also treat Enter as submit or Escape as close-modal).
   */
  onKeyDown: (e: KeyboardEvent) => boolean;
}

export function useMentionEmojiWiring(
  opts: MentionEmojiWiringOptions,
): MentionEmojiWiring {
  const mention = useMention();
  const emoji = useEmoji();

  let wrapperEl: HTMLDivElement | undefined;
  function wrapperRef(el: HTMLDivElement) {
    wrapperEl = el;
  }

  function getEditor(): HTMLDivElement | null {
    return wrapperEl?.querySelector<HTMLDivElement>("[contenteditable]") ?? null;
  }
  function getTA(): HTMLTextAreaElement | null {
    return wrapperEl?.querySelector<HTMLTextAreaElement>("textarea") ?? null;
  }

  createEffect(() => {
    void opts.body();
    const editor = getEditor();
    if (editor) {
      const mq = getWysiwygMentionQuery();
      if (mq !== null) {
        const r = getCaretRect();
        if (r) mention.openWithQuery(mq, r);
        emoji.close();
        return;
      }
      const eq = getWysiwygEmojiQuery();
      if (eq !== null) {
        const r = getCaretRect();
        if (r) emoji.openWithQuery(eq, r);
        mention.close();
        return;
      }
    }
    const ta = getTA();
    if (ta) {
      const mq = getTextareaMentionQuery(ta);
      if (mq !== null) {
        mention.openWithQuery(mq, ta.getBoundingClientRect());
        emoji.close();
        return;
      }
      const eq = getTextareaEmojiQuery(ta);
      if (eq !== null) {
        emoji.openWithQuery(eq, ta.getBoundingClientRect());
        mention.close();
        return;
      }
    }
    mention.close();
    emoji.close();
  });

  function selectMention(entry?: MentionEntry) {
    const e = entry ?? mention.filtered()[mention.activeIdx()];
    if (!e) return;
    const editor = getEditor();
    if (editor) {
      mention.insertWysiwyg(e, () =>
        opts.setBody(htmlToSource(editor.innerHTML, opts.mimetype())),
      );
      return;
    }
    const ta = getTA();
    if (ta) mention.insertTextarea(e, ta, opts.setBody);
  }

  function selectEmoji(entry?: EmojiEntry) {
    const e = entry ?? emoji.filtered()[emoji.activeIdx()];
    if (!e) return;
    const editor = getEditor();
    if (editor) {
      emoji.insertWysiwyg(e, () =>
        opts.setBody(htmlToSource(editor.innerHTML, opts.mimetype())),
      );
      return;
    }
    const ta = getTA();
    if (ta) emoji.insertTextarea(e, ta, opts.setBody);
  }

  function onKeyDown(e: KeyboardEvent): boolean {
    if (mention.open()) {
      const consumed = mention.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") selectMention();
        return true;
      }
      return false;
    }
    if (emoji.open()) {
      const consumed = emoji.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") selectEmoji();
        return true;
      }
      return false;
    }
    return false;
  }

  return { mention, emoji, wrapperRef, selectMention, selectEmoji, onKeyDown };
}
