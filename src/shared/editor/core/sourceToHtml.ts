import { marked } from "marked";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import type { MimeType } from "../types/editor.types";

/** Convert source-format body to HTML for the WYSIWYG editor. */
export function sourceToHtml(body: string, mimetype: MimeType): string {
  if (mimetype === "text/html") return body;
  if (mimetype === "text/markdown") return marked.parse(body) as string;
  return bbcodeToHtml(body);
}
