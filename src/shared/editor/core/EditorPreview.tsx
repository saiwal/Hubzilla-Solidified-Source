import { createMemo } from "solid-js";
import { marked } from "marked";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import type { MimeType } from "../types/editor.types";

interface Props {
  body: string;
  mimetype: MimeType;
}

export default function EditorPreview(props: Props) {
  const html = createMemo(() => {
    const body = props.body;
    if (props.mimetype === "text/html") return body;
    if (props.mimetype === "text/markdown") return marked.parse(body) as string;
    return bbcodeToHtml(body);
  });

  const srcdoc = () => `
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: system-ui, sans-serif; font-size: 14px;
               padding: 12px; margin: 0; line-height: 1.6; color: #1a1a1a; }
        img { max-width: 100%; }
        pre { background: #f0f0f0; padding: 8px; border-radius: 4px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
        blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 12px; color: #555; }
        a { color: #2563eb; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #ddd; padding: 6px 8px; }
        th { background: #f5f5f5; }
      </style>
    </head>
    <body>${html()}</body>
    </html>
  `;

  return (
    <iframe
      srcdoc={srcdoc()}
      sandbox="allow-same-origin"
      class="w-full min-h-[120px] border-0 bg-white"
      onLoad={(e) => {
        const iframe = e.currentTarget;
        try {
          const h = iframe.contentDocument?.body?.scrollHeight;
          if (h) iframe.style.height = `${h + 24}px`;
        } catch {
          // cross-origin guard
        }
      }}
    />
  );
}
