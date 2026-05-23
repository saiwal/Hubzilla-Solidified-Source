import TurndownService from "turndown";
import type { MimeType } from "../types/editor.types";

const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

/** Convert WYSIWYG HTML to the chosen source format. */
export function htmlToSource(html: string, mimetype: MimeType): string {
  if (mimetype === "text/html") return html;
  if (mimetype === "text/markdown") return td.turndown(html);
  return htmlToBBCode(html);
}

function htmlToBBCode(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return nodeTobbcode(doc.body).trim();
}

function nodeTobbcode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";

  const el = node as Element;
  const children = () =>
    Array.from(el.childNodes).map(nodeTobbcode).join("");

  const tag = el.tagName?.toLowerCase();
  switch (tag) {
    case "b":
    case "strong":    return `[b]${children()}[/b]`;
    case "i":
    case "em":        return `[i]${children()}[/i]`;
    case "u":         return `[u]${children()}[/u]`;
    case "s":
    case "strike":
    case "del":       return `[s]${children()}[/s]`;
    case "mark":      return `[highlight]${children()}[/highlight]`;
    case "code":      return `[code]${children()}[/code]`;
    case "pre":       return `[code]${el.textContent ?? ""}[/code]`;
    case "blockquote":return `[quote]${children()}[/quote]`;
    case "h1":        return `[size=xx-large]${children()}[/size]\n`;
    case "h2":        return `[size=x-large]${children()}[/size]\n`;
    case "h3":        return `[size=large]${children()}[/size]\n`;
    case "h4":
    case "h5":
    case "h6":        return `[size=medium]${children()}[/size]\n`;
    case "p":         return `${children()}\n`;
    case "br":        return "\n";
    case "hr":        return "\n[hr]\n";
    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `[url=${href}]${children()}[/url]`;
    }
    case "img": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      return alt ? `[img alt="${alt}"]${src}[/img]` : `[img]${src}[/img]`;
    }
    case "ul": {
      const items = Array.from(el.querySelectorAll(":scope > li"))
        .map((li) => `[*]${nodeTobbcode(li)}`)
        .join("\n");
      return `[list]\n${items}\n[/list]\n`;
    }
    case "ol": {
      const items = Array.from(el.querySelectorAll(":scope > li"))
        .map((li) => `[*]${nodeTobbcode(li)}`)
        .join("\n");
      return `[list=1]\n${items}\n[/list]\n`;
    }
    case "li":        return children();
    case "div":
    case "span":
    case "body":      return children();
    default:          return children();
  }
}
