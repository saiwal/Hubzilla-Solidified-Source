import type { EmojiMap } from '../store/emoji-store';

// Replaces :shortname: in HTML text nodes with <img> emoji tags.
// The regex alternation captures HTML tags first so they pass through unchanged.
export function emojify(html: string, map: EmojiMap): string {
  if (!html || !Object.keys(map).length) return html;
  return html.replace(/(<[^>]+>)|:([a-zA-Z0-9_+-]+):/g, (match, tag, name) => {
    if (tag !== undefined) return tag;
    const entry = map[name];
    if (!entry) return match;
    return `<img src="/${entry.filepath}" class="emoji" alt="${entry.shortname}" title="${entry.shortname}" loading="lazy">`;
  });
}
