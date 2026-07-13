// src/shared/lib/useToc.ts
import { createSignal, createEffect, onCleanup } from "solid-js";

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export function extractHeadings(container: HTMLElement): TocEntry[] {
  const nodes = container.querySelectorAll("h1, h2, h3, h4");
  const entries: TocEntry[] = [];
  nodes.forEach((node, i) => {
    const text = (node as HTMLElement).innerText?.trim();
    if (!text) return;
    if (!node.id) node.id = `heading-${i}`;
    entries.push({ id: node.id, text, level: parseInt(node.tagName[1], 10) });
  });
  return entries;
}

// Extracts headings from a rendered content body and tracks which one is
// currently in view. `content` should be the reactive HTML string (or any
// value) that changes whenever `bodyRef` gets new content — it's read only
// to retrigger the effect. `bodyRef` is read lazily so a plain `let` ref
// assigned via `ref={...}` works.
export function useToc(content: () => unknown, bodyRef: () => HTMLElement | undefined) {
  const [toc, setToc] = createSignal<TocEntry[]>([]);
  const [activeId, setActiveId] = createSignal("");

  createEffect(() => {
    const tracked = content();
    const el = bodyRef();
    if (!tracked || !el) return;

    requestAnimationFrame(() => {
      const container = bodyRef();
      if (!container) return;
      const entries = extractHeadings(container);
      setToc(entries);
      if (entries.length) setActiveId(entries[0].id);

      const observer = new IntersectionObserver(
        (observations) => {
          const visible = observations
            .filter((o) => o.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible.length) setActiveId(visible[0].target.id);
        },
        { rootMargin: "0px 0px -60% 0px", threshold: 0 },
      );
      entries.forEach(({ id }) => {
        const target = document.getElementById(id);
        if (target) observer.observe(target);
      });
      onCleanup(() => observer.disconnect());
    });
  });

  return { toc, activeId, setToc, setActiveId };
}
