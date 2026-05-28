import type { MimeType } from "../types/editor.types";

// Matches [img]url[/img] and [img alt="text"]url[/img]
const IMG_RE = /\[img(?:\s+alt="([^"]*)")?\](.+?)\[\/img\]/gi;
const ATTACH_RE = /\[attachment\](.+?)\[\/attachment\]/gi;

/**
 * Converts a BBCode attachment tag to the appropriate format for the current mimetype.
 * Input is always BBCode ([img]...[/img] or [img alt="..."]...[/img]).
 */
export function bbcodeToInsert(bbcode: string, mime: MimeType): string {
  if (mime === "text/bbcode") return bbcode;

  if (mime === "text/markdown") {
    return bbcode
      .replace(IMG_RE, (_, alt: string | undefined, url: string) =>
        `![${alt ?? ""}](${url})`,
      )
      .replace(ATTACH_RE, (_, url: string) => `[attachment](${url})`);
  }

  // text/html
  return bbcode
    .replace(IMG_RE, (_, alt: string | undefined, url: string) =>
      alt ? `<img src="${url}" alt="${alt}" />` : `<img src="${url}" />`,
    )
    .replace(ATTACH_RE, (_, url: string) => `<a href="${url}">${url}</a>`);
}
