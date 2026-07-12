import type { EmojiEntry, EmojiMap } from '../store/emoji-store';

export function emojiEntryToImg(entry: EmojiEntry, singleEmoji = false): string {
  const cls = singleEmoji ? "emoji single-emoji" : "emoji";
  return `<img src="/${entry.filepath}" class="${cls}" alt="${entry.shortname}" title="${entry.shortname}" loading="lazy">`;
}

// Replaces :shortname: in HTML text nodes with <img> emoji tags.
// The regex alternation captures HTML tags first so they pass through unchanged.
// When the whole message is nothing but one recognized shortcode (Hubzilla's
// classic "jumbo" treatment for solo-emoji posts/reactions), that image also
// gets a "single-emoji" class for larger rendering (see index.css).
export function emojify(html: string, map: EmojiMap): string {
  if (!html || !Object.keys(map).length) return html;

  const stripped = html.replace(/<[^>]+>/g, "").trim();
  const soloMatch = /^:([a-zA-Z0-9_+-]+):$/.exec(stripped);
  const isSingleEmoji = soloMatch !== null && !!map[soloMatch[1]];

  return html.replace(/(<[^>]+>)|:([a-zA-Z0-9_+-]+):/g, (match, tag, name) => {
    if (tag !== undefined) return tag;
    const entry = map[name];
    if (!entry) return match;
    return emojiEntryToImg(entry, isSingleEmoji);
  });
}
