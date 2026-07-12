/**
 * hydrateLatex.ts
 * Renders $…$ / $$…$$ LaTeX left in already-rendered HTML (webpages, wiki
 * pages) into real KaTeX math, in place. This is the counterpart to the
 * "image" LaTeX insert mode (see renderLatexImage.ts): content that's read
 * in-app rather than federated as a standalone object gets a live client-side
 * render instead of a pre-rendered image, so it renders in whatever theme
 * the reader is using.
 *
 * katex + its stylesheet are only pulled in the first time a page actually
 * contains math, so pages without any never pay for it.
 */

// Cheap existence check before paying for the katex import.
// Exported for reuse by the WYSIWYG editor's own hydrator (sourceToHtml.ts),
// which needs the same match logic but wraps results in editable chips
// instead of replacing text in place.
export const SCAN_RE = /\$\$[^$]+?\$\$|\$[^\s$][^$\n]*?[^\s$]\$(?!\d)|\$[^\s$]\$(?!\d)/;
// Block ($$…$$) tried first so it isn't misread as two empty inline matches.
export const MATCH_RE = /\$\$([^$]+?)\$\$|\$([^\s$](?:[^$\n]*[^\s$])?)\$(?!\d)/g;

let katexPromise: Promise<typeof import("katex").default> | null = null;
// Shared cache so the editor hydrator doesn't pay for a second katex import.
export function loadKatex() {
  if (!katexPromise) {
    katexPromise = Promise.all([
      import("katex"),
      import("katex/dist/katex.min.css"),
    ]).then(([mod]) => mod.default);
  }
  return katexPromise;
}

/** Walks `root`'s text nodes (skipping code/pre/script/style) and renders any $…$ / $$…$$ math found. */
export function hydrateLatex(root: HTMLElement): void {
  if (!SCAN_RE.test(root.textContent ?? "")) return;

  void loadKatex().then((katex) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const el = node.parentElement;
        if (el?.closest("code, pre, script, style, .katex")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const targets: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) targets.push(n as Text);

    for (const textNode of targets) {
      const text = textNode.textContent ?? "";
      MATCH_RE.lastIndex = 0;
      if (!MATCH_RE.test(text)) continue;

      const frag = document.createDocumentFragment();
      let last = 0;
      let m: RegExpExecArray | null;
      MATCH_RE.lastIndex = 0;
      while ((m = MATCH_RE.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const isBlock = m[1] !== undefined;
        const expr = (isBlock ? m[1] : m[2]) ?? "";
        const el = document.createElement(isBlock ? "div" : "span");
        el.className = "bb-latex-live";
        try {
          el.innerHTML = katex.renderToString(expr.trim(), {
            displayMode: isBlock,
            throwOnError: false,
            output: "html",
          });
        } catch {
          el.textContent = m[0];
        }
        frag.appendChild(el);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.replaceWith(frag);
    }
  });
}
