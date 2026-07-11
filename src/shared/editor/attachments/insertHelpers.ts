import type { MimeType } from "../types/editor.types";
import type { Attachment } from "./types";

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

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Rewrites the alt text of an attachment image that was already inserted into
 * the body (Insert snapshots the alt at click time — editing it afterwards
 * must patch the body too). The image is located by its unique insertUrl; a
 * body without a match is returned unchanged.
 */
export function patchInsertedAlt(body: string, att: Attachment, mime: MimeType): string {
  const url = att.insertUrl;
  if (!url) return body;
  const esc = escapeRe(url);
  // '[' and ']' would terminate the bbcode tag; '"' would terminate the attr.
  const alt = (att.altText ?? "").trim().replace(/[[\]"]/g, "");

  if (mime === "text/markdown") {
    return body.replace(new RegExp(`!\\[[^\\]]*\\]\\(${esc}\\)`, "g"), `![${alt}](${url})`);
  }
  if (mime === "text/html") {
    return body.replace(
      new RegExp(`<img[^>]*src="${esc}"[^>]*/?>`, "gi"),
      alt ? `<img src="${url}" alt="${alt}" />` : `<img src="${url}" />`,
    );
  }

  // bbcode — photo form: [zmg=url]label[/zmg]; the label doubles as alt text
  // and falls back to the filename, mirroring insertBBCode.
  body = body.replace(
    new RegExp(`\\[zmg=${esc}\\][^[]*\\[/zmg\\]`, "gi"),
    `[zmg=${url}]${alt || att.filename}[/zmg]`,
  );
  // bbcode — upload form: [img]url[/img] with optional attributes (width from
  // the resize popup must survive, so only the alt attribute is swapped out).
  body = body.replace(
    new RegExp(`\\[img([^\\]]*)\\]${esc}\\[/img\\]`, "gi"),
    (_m, attrs: string) => {
      let a = attrs.replace(/\s*alt=("[^"]*"|'[^']*')/i, "").trim();
      if (alt) a = a ? `${a} alt="${alt}"` : `alt="${alt}"`;
      return a ? `[img ${a}]${url}[/img]` : `[img]${url}[/img]`;
    },
  );
  return body;
}
