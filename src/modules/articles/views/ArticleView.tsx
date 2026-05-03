// src/modules/articles/views/ArticleView.tsx
import { createResource, createSignal, createEffect, onCleanup, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { fetchArticle } from "../api";
import DOMPurify from "dompurify";
import { usePageNick } from "@/shared/store/site-config";

// ── types ─────────────────────────────────────────────────────────────────────

interface TocEntry {
  id: string;
  text: string;
  level: number; // 1–4
}

// ── helpers ───────────────────────────────────────────────────────────────────

function extractHeadings(container: HTMLElement): TocEntry[] {
  const nodes = container.querySelectorAll("h1, h2, h3, h4");
  const entries: TocEntry[] = [];

  nodes.forEach((node, i) => {
    const text = (node as HTMLElement).innerText?.trim();
    if (!text) return;
    if (!node.id) node.id = `heading-${i}`;
    const level = parseInt(node.tagName[1], 10);
    entries.push({ id: node.id, text, level });
  });

  return entries;
}

// ── TOC component ─────────────────────────────────────────────────────────────

function TableOfContents(props: { entries: TocEntry[]; activeId: string }) {
  const [expanded, setExpanded] = createSignal(true);
  const minLevel = () => Math.min(...props.entries.map((e) => e.level));

  const indent = (level: number) => {
    const diff = level - minLevel();
    if (diff === 0) return "";
    if (diff === 1) return "pl-3";
    return "pl-6";
  };

  return (
    <nav
      class="xl:fixed xl:top-24 xl:w-52 w-full bg-surface xl:bg-transparent
             border border-rim xl:border-0 rounded-xl xl:rounded-none p-3 xl:p-0"
      aria-label="Table of contents"
    >
      {/* Header row — always visible, toggles list on small screens */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        class="flex items-center justify-between w-full xl:cursor-default"
      >
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          On this page
        </span>
        <span class="xl:hidden text-muted text-xs">
          {expanded() ? "▲" : "▼"}
        </span>
      </button>

      {/* Entry list */}
      <Show when={expanded()}>
        <div class="mt-2 space-y-0.5 max-h-[50vh] xl:max-h-[70vh] overflow-y-auto">
          <For each={props.entries}>
            {(entry) => (
              <a
                href={`#${entry.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth" });
                  // Collapse after tap on mobile
                  if (window.innerWidth < 1280) setExpanded(false);
                }}
                class={`block text-xs py-0.5 px-1 rounded transition-colors truncate
                  ${indent(entry.level)}
                  ${props.activeId === entry.id
                    ? "text-accent font-medium"
                    : "text-muted hover:text-txt"
                  }`}
              >
                {entry.text}
              </a>
            )}
          </For>
        </div>
      </Show>
    </nav>
  );
}

// ── main view ─────────────────────────────────────────────────────────────────

export default function ArticleView() {
  const params = useParams<{ nick: string; uuid: string }>();
  const pageNick = usePageNick();
  const nick = () => params.nick || pageNick();

  const [data] = createResource(
    () => ({ nick: nick(), uuid: params.uuid }),
    ({ nick, uuid }) => fetchArticle(nick, uuid),
  );

  const rendered = () =>
    data()?.article ? DOMPurify.sanitize(data()!.article.body ?? "") : "";

  const [toc, setToc] = createSignal<TocEntry[]>([]);
  const [activeId, setActiveId] = createSignal("");
  let bodyRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!rendered() || !bodyRef) return;

    requestAnimationFrame(() => {
      if (!bodyRef) return;

      const entries = extractHeadings(bodyRef);
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
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });

      onCleanup(() => observer.disconnect());
    });
  });

  return (
    <div class="relative max-w-5xl mx-auto py-4">
      <Show when={!data.loading && data()} fallback={<ArticleViewSkeleton />}>
        {(d) => (
          <div class="xl:flex xl:gap-8">
            {/* ── Article ── */}
            <article class="min-w-0 flex-1 max-w-3xl space-y-6">
              <A
                href={`/articles/${nick()}`}
                class="inline-flex items-center gap-1 text-sm text-muted hover:text-txt transition-colors"
              >
                ← All articles
              </A>

              <header class="space-y-2 border-b border-rim pb-4">
                <h1 class="text-3xl font-bold leading-tight text-txt">
                  {d().article.title || "(Untitled)"}
                </h1>
                <Show when={d().article.summary}>
                  <p class="text-lg text-muted italic leading-snug">
                    {d().article.summary}
                  </p>
                </Show>
                <p class="text-sm text-muted">
                  {new Date(
                    d().article.created.replace(" ", "T") + "Z",
                  ).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {" by "}
                  <a href={d().article.authorUrl} class="hover:underline text-txt">
                    {d().article.authorName}
                  </a>
                </p>
              </header>

              {/* TOC inline on small screens */}
              <Show when={toc().length > 1}>
                <div class="xl:hidden">
                  <TableOfContents entries={toc()} activeId={activeId()} />
                </div>
              </Show>

              <div
                ref={bodyRef}
                class="prose dark:prose-invert max-w-none"
                // eslint-disable-next-line solid/no-innerhtml
                innerHTML={rendered()}
              />

              <div class="flex gap-4 text-sm text-muted border-t border-rim pt-4">
                <span>♥ {d().article.likeCount}</span>
                <span>👎 {d().article.dislikeCount}</span>
                <span>🔁 {d().article.repeatCount}</span>
              </div>

              <section class="space-y-4">
                <h2 class="text-base font-semibold text-txt">
                  Comments ({d().comments.length})
                </h2>
                <Show
                  when={d().comments.length > 0}
                  fallback={<p class="text-sm text-muted">No comments yet.</p>}
                >
                  <For each={d().comments}>
                    {(c) => (
                      <div class="flex gap-3">
                        <Show when={c.authorAvatar}>
                          <img
                            src={c.authorAvatar}
                            alt={c.authorName}
                            class="w-8 h-8 rounded-full shrink-0 object-cover"
                          />
                        </Show>
                        <div class="flex-1 bg-surface border border-rim rounded-lg p-3 space-y-1">
                          <div class="flex items-center gap-2 text-xs text-muted">
                            <span class="font-medium text-txt">{c.authorName}</span>
                            <span>
                              {new Date(
                                c.created.replace(" ", "T") + "Z",
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          <div
                            class="text-sm prose dark:prose-invert max-w-none"
                            innerHTML={DOMPurify.sanitize(c.body ?? "")}
                          />
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              </section>
            </article>

            {/* ── Floating TOC — fixed sidebar on xl+ ── */}
            <Show when={toc().length > 1}>
              <aside class="hidden xl:block shrink-0 w-52">
                <TableOfContents entries={toc()} activeId={activeId()} />
              </aside>
            </Show>
          </div>
        )}
      </Show>
    </div>
  );
}

function ArticleViewSkeleton() {
  return (
    <div class="space-y-6 animate-pulse">
      <div class="h-4 bg-elevated rounded w-20" />
      <div class="space-y-3 border-b border-rim pb-4">
        <div class="h-8 bg-elevated rounded w-3/4" />
        <div class="h-3 bg-elevated rounded w-1/3" />
      </div>
      <div class="space-y-2">
        <For each={Array(8).fill(0)}>
          {() => <div class="h-3 bg-elevated rounded w-full" />}
        </For>
      </div>
    </div>
  );
}
