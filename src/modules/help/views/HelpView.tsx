// src/modules/help/views/HelpView.tsx
import { createSignal, createEffect, onCleanup, Show, For } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { useParams, A } from "@solidjs/router";
import DOMPurify from "dompurify";
import { useI18n } from "@/i18n";
import { MdOutlineToc } from "solid-icons/md";
import { fetchTopic } from "../api";

// ── types ─────────────────────────────────────────────────────────────────────

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

// ── TOC ───────────────────────────────────────────────────────────────────────

function extractHeadings(el: HTMLElement): TocEntry[] {
  const entries: TocEntry[] = [];
  el.querySelectorAll("h1,h2,h3,h4").forEach((node, i) => {
    const text = (node as HTMLElement).innerText?.trim();
    if (!text) return;
    if (!node.id) node.id = `h-${i}`;
    entries.push({ id: node.id, text, level: parseInt(node.tagName[1], 10) });
  });
  return entries;
}

function TableOfContents(props: { entries: TocEntry[]; activeId: string }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = createSignal(true);
  const minLevel = () => Math.min(...props.entries.map((e) => e.level));
  const indent = (level: number) => {
    const d = level - minLevel();
    return d === 0 ? "" : d === 1 ? "pl-3" : "pl-6";
  };

  return (
    <nav
      class="xl:fixed xl:top-24 xl:w-52 w-full bg-surface xl:bg-transparent
             border border-rim xl:border-0 rounded-xl xl:rounded-none p-3 xl:p-0"
      aria-label={t("help.on_this_page")}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        class="flex items-center justify-between w-full xl:cursor-default"
      >
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("help.on_this_page")}
        </span>
        <span class="xl:hidden text-muted text-xs">{expanded() ? "▲" : "▼"}</span>
      </button>
      <Show when={expanded()}>
        <div class="mt-2 space-y-0.5 max-h-[50vh] xl:max-h-[70vh] overflow-y-auto">
          <For each={props.entries}>
            {(entry) => (
              <a
                href={`#${entry.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth" });
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

// ── Floating TOC (small screens) ────────────────────────────────────────────────

function FloatingToc(props: { entries: TocEntry[]; activeId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = createSignal(false);
  const minLevel = () => Math.min(...props.entries.map((e) => e.level));
  const indent = (level: number) => {
    const d = level - minLevel();
    return d === 0 ? "" : d === 1 ? "pl-3" : "pl-6";
  };

  return (
    <div class="xl:hidden fixed top-20 right-4 z-40 flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open()}
        aria-label={t("help.on_this_page")}
        class="w-11 h-11 rounded-full flex items-center justify-center
               bg-elevated border border-rim shadow-lg hover:shadow-xl
               text-muted hover:text-txt transition-all"
      >
        <MdOutlineToc size={20} />
      </button>
      <Show when={open()}>
        <div
          class="mt-2 w-64 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto
                 bg-surface border border-rim rounded-xl shadow-2xl p-3"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("help.on_this_page")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close table of contents"
              class="p-1 rounded text-muted hover:bg-elevated hover:text-txt transition-colors"
            >
              ✕
            </button>
          </div>
          <div class="space-y-0.5">
            <For each={props.entries}>
              {(entry) => (
                <a
                  href={`#${entry.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth" });
                    setOpen(false);
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
        </div>
      </Show>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ContentSkeleton() {
  return (
    <div class="space-y-4 animate-pulse flex-1">
      <div class="h-7 bg-elevated rounded w-1/2" />
      <div class="space-y-2">
        <For each={Array(12).fill(0)}>
          {() => (
            <div
              class="h-3 bg-elevated rounded"
              style={{ width: `${50 + Math.random() * 50}%` }}
            />
          )}
        </For>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HelpView() {
  // Route: /help/*rest → rest = "section/...topic" (no lang in URL)
  const params = useParams<{ rest: string }>();
  const { locale } = useI18n();

  const parts = () => (params.rest ?? "").split("/").filter(Boolean);
  const section = () => parts()[0] || "user";
  const topic = () => parts().slice(1).join("/");
  // Use app locale as doc lang; PHP falls back to any available lang if not found
  const lang = () => locale().split("-")[0]; // "en-US" → "en"

  const [topicData] = createQueryResource(
    "help-topic",
    () => ({ section: section(), lang: lang(), topic: topic() }),
    ({ section, lang, topic }) => fetchTopic(section, lang, topic),
  );

  const rendered = () =>
    topicData()?.html ? DOMPurify.sanitize(topicData()!.html) : "";

  // TOC
  const [toc, setToc] = createSignal<TocEntry[]>([]);
  const [activeId, setActiveId] = createSignal("");
  let bodyRef: HTMLDivElement | undefined;

  // Clear TOC whenever the route changes so stale entries don't linger
  createEffect(() => {
    section();
    topic(); // track both
    setToc([]);
    setActiveId("");
  });

  createEffect(() => {
    const html = rendered();
    if (!html || !bodyRef) return;
    requestAnimationFrame(() => {
      if (!bodyRef) return;
      const entries = extractHeadings(bodyRef);
      setToc(entries);
      if (entries.length) setActiveId(entries[0].id);

      const obs = new IntersectionObserver(
        (obs) => {
          const visible = obs
            .filter((o) => o.isIntersecting)
            .sort(
              (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
            );
          if (visible.length) setActiveId(visible[0].target.id);
        },
        { rootMargin: "0px 0px -60% 0px", threshold: 0 },
      );
      entries.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) obs.observe(el);
      });
      onCleanup(() => obs.disconnect());
    });
  });

  return (
    <div class="relative max-w-5xl mx-auto py-4">
      <div class="xl:flex xl:gap-8">
        {/* ── Content ── */}
        <article class="min-w-0 flex-1 max-w-none xl:max-w-3xl space-y-5">
          <Show when={topicData.loading}>
            <ContentSkeleton />
          </Show>

          <Show when={topicData.error}>
            <div class="bg-surface border border-rim rounded-xl p-8 text-center space-y-3">
              <p class="text-sm text-red-500">
                {topicData.error?.message ?? "Page not found."}
              </p>
              <A
                href={`/help/${section()}`}
                class="text-sm text-accent hover:underline"
              >
                ← Back
              </A>
            </div>
          </Show>

          <Show when={!topicData.loading && topicData()}>
            <>
              {/* Body */}
              <div
                ref={bodyRef}
                class="prose dark:prose-invert max-w-none
                       prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                       prose-blockquote:not-italic prose-blockquote:border-accent
                       prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-sm
                       prose-code:before:content-none prose-code:after:content-none
                       prose-img:rounded-lg break-words"
                innerHTML={rendered()}
              />
            </>
          </Show>
        </article>

        {/* ── TOC — fixed sidebar on xl+, floating collapsed launcher below xl ── */}
        <Show when={toc().length > 1}>
          <aside class="hidden xl:block shrink-0 w-52">
            <TableOfContents entries={toc()} activeId={activeId()} />
          </aside>
          <FloatingToc entries={toc()} activeId={activeId()} />
        </Show>
      </div>
    </div>
  );
}
