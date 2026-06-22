export type EmojiEntry = { shortname: string; filepath: string };
export type EmojiMap = Record<string, EmojiEntry>;

let map: EmojiMap = {};

fetch('/smilies', { credentials: 'include' })
  .then(r => r.ok ? r.json() : {})
  .then((data: EmojiMap) => { map = data; })
  .catch(() => {});

export const getEmojiMap = (): EmojiMap => map;
