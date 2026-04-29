import type { MimeType } from "../types/editor.types";

/**
 * Sandboxed preview pane.
 * Renders BBCode/HTML in an iframe srcdoc so scripts and styles can't leak.
 * The parent is responsible for converting BBCode → HTML before passing it in
 * (or pass raw HTML when mimetype is text/html).
 */
interface Props {
  body: string;
  mimetype: MimeType;
}

export default function EditorPreview(props: Props) {
  // Very basic BBCode → HTML passthrough.
  // Replace with your full bbcodeToHtml() import when ready.
  const html = () => {
    if (props.mimetype === "text/html") return props.body;
    // Minimal subset — bold, italic, links, images
    return props.body
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<strong>$1</strong>")
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<em>$1</em>")
      .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>")
      .replace(/\[url=(.*?)\]([\s\S]*?)\[\/url\]/gi, '<a href="$1">$2</a>')
      .replace(/\[img\]([\s\S]*?)\[\/img\]/gi, '<img src="$1" style="max-width:100%" />')
      .replace(/\n/g, "<br />");
  };

  const srcdoc = () => `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: system-ui, sans-serif; font-size: 14px;
               padding: 12px; margin: 0; line-height: 1.6; color: #1a1a1a; }
        img { max-width: 100%; }
        pre { background: #f0f0f0; padding: 8px; border-radius: 4px; overflow-x:auto; }
        blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 12px; color: #555; }
        a { color: #2563eb; }
      </style>
    </head>
    <body>${html()}</body>
    </html>
  `;

  return (
    <div class="border border-rim rounded-lg overflow-hidden">
      <div class="px-3 py-1.5 text-xs text-muted bg-elevated border-b border-rim font-medium">
        Preview
      </div>
      <iframe
        srcdoc={srcdoc()}
        sandbox="allow-same-origin"
        class="w-full min-h-[120px] border-0 bg-white"
        // Auto-resize to content
        onLoad={(e) => {
          const iframe = e.currentTarget;
          try {
            const h = iframe.contentDocument?.body?.scrollHeight;
            if (h) iframe.style.height = `${h + 24}px`;
          } catch {
            // cross-origin guard — shouldn't fire with sandbox allow-same-origin
          }
        }}
      />
    </div>
  );
}
