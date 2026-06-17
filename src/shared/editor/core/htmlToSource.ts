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

function getStyle(el: Element, prop: string): string {
  const style = el.getAttribute("style") ?? "";
  const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i"));
  return m ? m[1].trim() : "";
}

function nodeTobbcode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";

  const el = node as Element;
  const children = () => Array.from(el.childNodes).map(nodeTobbcode).join("");
  const tag = el.tagName?.toLowerCase();

  switch (tag) {
    case "b":
    case "strong":      return `[b]${children()}[/b]`;
    case "i":
    case "em":          return `[i]${children()}[/i]`;
    case "u":           return `[u]${children()}[/u]`;
    case "s":
    case "strike":
    case "del":         return `[s]${children()}[/s]`;
    case "mark":        return `[hl]${children()}[/hl]`;
    case "code":        return `[code]${children()}[/code]`;
    case "pre":         return `[code]${el.textContent ?? ""}[/code]`;
    case "blockquote":  return `[quote]${children()}[/quote]`;
    case "h1":          return `[h1]${children()}[/h1]\n`;
    case "h2":          return `[h2]${children()}[/h2]\n`;
    case "h3":          return `[h3]${children()}[/h3]\n`;
    case "h4":          return `[h4]${children()}[/h4]\n`;
    case "h5":          return `[h5]${children()}[/h5]\n`;
    case "h6":          return `[h6]${children()}[/h6]\n`;

    case "p": {
      const align = getStyle(el, "text-align");
      const inner = children();
      return align === "center" ? `[center]${inner}[/center]\n` : `${inner}\n`;
    }

    case "br":  return "\n";
    case "hr":  return "\n[hr]\n";

    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `[url=${href}]${children()}[/url]`;
    }

    case "img": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      return alt ? `[img alt="${alt}"]${src}[/img]` : `[img]${src}[/img]`;
    }

    case "video": {
      const src = el.getAttribute("src") ?? "";
      return `[video]${src}[/video]`;
    }

    case "audio": {
      const src = el.getAttribute("src") ?? "";
      return `[audio]${src}[/audio]`;
    }

    case "ul": {
      const items = Array.from(el.querySelectorAll(":scope > li"))
        .map(li => `[*]${nodeTobbcode(li)}`)
        .join("\n");
      return `[list]\n${items}\n[/list]\n`;
    }
    case "ol": {
      const items = Array.from(el.querySelectorAll(":scope > li"))
        .map(li => `[*]${nodeTobbcode(li)}`)
        .join("\n");
      return `[list=1]\n${items}\n[/list]\n`;
    }
    case "li":  return children();

    case "table": {
      const rows = Array.from(el.querySelectorAll("tr"));
      const rowsStr = rows.map(row => {
        const cells = Array.from(row.children).map(cell => {
          const ct = cell.tagName.toLowerCase() === "th" ? "th" : "td";
          return `[${ct}]${nodeTobbcode(cell)}[/${ct}]`;
        }).join("");
        return `[tr]${cells}[/tr]`;
      }).join("\n");
      return `[table]\n${rowsStr}\n[/table]\n`;
    }
    // tr/th/td handled inside "table" above; fall through to children() for orphans
    case "tr":
    case "th":
    case "td":  return children();

    case "details": {
      const summary = el.querySelector("summary")?.textContent?.trim() ?? "";
      const bodyParts = Array.from(el.childNodes)
        .filter(n => (n as Element).tagName?.toLowerCase() !== "summary")
        .map(nodeTobbcode)
        .join("");
      return summary
        ? `[spoiler=${summary}]${bodyParts}[/spoiler]`
        : `[spoiler]${bodyParts}[/spoiler]`;
    }
    case "summary": return "";

    // <font> produced by older execCommand paths (non-Chrome)
    case "font": {
      let result = children();
      const size = el.getAttribute("size");
      const face = el.getAttribute("face");
      const color = el.getAttribute("color");
      if (size) {
        const sizeMap: Record<string, string> = {
          "1": "xx-small", "2": "small", "3": "medium",
          "4": "large",    "5": "x-large","6": "xx-large", "7": "xx-large",
        };
        result = `[size=${sizeMap[size] ?? "medium"}]${result}[/size]`;
      }
      if (face) result = `[font=${face}]${result}[/font]`;
      if (color) result = `[color=${color}]${result}[/color]`;
      return result;
    }

    // <span style="color:…; font-family:…; font-size:…; background-color:…">
    case "span": {
      let result = children();
      const bgColor = getStyle(el, "background-color");
      const fontSize = getStyle(el, "font-size");
      const fontFamily = getStyle(el, "font-family");
      const color = getStyle(el, "color");
      if (bgColor && bgColor !== "transparent") result = `[hl=${bgColor}]${result}[/hl]`;
      if (fontSize) result = `[size=${fontSize}]${result}[/size]`;
      if (fontFamily) result = `[font=${fontFamily}]${result}[/font]`;
      if (color) result = `[color=${color}]${result}[/color]`;
      return result;
    }

    case "div": {
      const align = getStyle(el, "text-align");
      const result = children();
      return align === "center" ? `[center]${result}[/center]\n` : `${result}\n`;
    }

    case "body": return children();
    default:     return children();
  }
}
