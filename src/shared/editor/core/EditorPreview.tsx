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

  // Read the active theme's CSS custom properties at render time so the iframe
  // inherits the same palette as the rest of the app.
  const themeVars = () => {
    const s = getComputedStyle(document.documentElement);
    const v = (name: string) => s.getPropertyValue(name).trim();
    return [
      `--color-base: ${v("--color-base")}`,
      `--color-surface: ${v("--color-surface")}`,
      `--color-elevated: ${v("--color-elevated")}`,
      `--color-overlay: ${v("--color-overlay")}`,
      `--color-txt: ${v("--color-txt")}`,
      `--color-muted: ${v("--color-muted")}`,
      `--color-subtle: ${v("--color-subtle")}`,
      `--color-rim: ${v("--color-rim")}`,
      `--color-accent: ${v("--color-accent")}`,
      `--color-accent-txt: ${v("--color-accent-txt")}`,
    ].join("; ");
  };

  const srcdoc = () => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    :root { ${themeVars()} }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.65;
      padding: 16px;
      margin: 0;
      color: var(--color-txt);
      background: var(--color-surface);
    }
    p { margin: 0.5em 0; }
    p:first-child { margin-top: 0; }
    p:last-child  { margin-bottom: 0; }
    h1, h2, h3, h4, h5, h6 {
      color: var(--color-txt);
      line-height: 1.3;
      margin: 0.75em 0 0.25em;
      font-weight: 700;
    }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.25rem; }
    h3 { font-size: 1.125rem; font-weight: 600; }
    h4 { font-size: 1rem; font-weight: 600; }
    h5, h6 { font-size: 0.9rem; font-weight: 600; }
    a { color: var(--color-accent); }
    strong { font-weight: 700; }
    em { font-style: italic; }
    s, del { text-decoration: line-through; }
    mark { background: #facc15; color: #1a1a1a; padding: 0 2px; border-radius: 2px; }
    blockquote {
      border-left: 3px solid var(--color-rim);
      margin: 0.75em 0;
      padding: 0.25em 0 0.25em 12px;
      color: var(--color-muted);
    }
    hr { border: none; border-top: 1px solid var(--color-rim); margin: 1em 0; }
    pre {
      background: var(--color-overlay);
      color: var(--color-txt);
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 0.875rem;
      margin: 0.75em 0;
    }
    code {
      background: var(--color-overlay);
      color: var(--color-txt);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.85em;
    }
    pre code { background: transparent; padding: 0; border-radius: 0; }
    ul { list-style: disc;    padding-left: 1.25rem; margin: 0.5em 0; }
    ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5em 0; }
    li { margin: 0.125rem 0; }
    img { max-width: 100%; height: auto; }
    video, audio { max-width: 100%; display: block; margin: 0.5em 0; }
    table { border-collapse: collapse; width: 100%; margin: 0.75em 0; }
    td, th { border: 1px solid var(--color-rim); padding: 6px 10px; text-align: left; }
    th { background: var(--color-elevated); font-weight: 600; }
    details { border: 1px solid var(--color-rim); border-radius: 6px; padding: 8px 12px; margin: 0.5em 0; }
    summary { cursor: pointer; color: var(--color-muted); font-size: 0.875rem; }
  </style>
</head>
<body>${html()}</body>
</html>`;

  return (
    <iframe
      srcdoc={srcdoc()}
      sandbox="allow-same-origin"
      class="w-full h-full border-0"
    />
  );
}
