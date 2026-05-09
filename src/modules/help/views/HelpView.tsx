// src/modules/help/views/HelpView.tsx
import {
  createResource,
  createSignal,
  createEffect,
  onCleanup,
  Show,
  For,
} from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import DOMPurify from "dompurify";
import { fetchNav, fetchTopic, type NavNode } from "../api";

// ── types ─────────────────────────────────────────────────────────────────────

interface TocEntry { id: string; text: string; level: number }

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
  const [open, setOpen] = createSignal(true);
  const min = () => Math.min(...props.entries.map((e) => e.level));
  const indent = (l: number) => ["", "pl-3", "pl-6"][Math.min(l - min(), 2)];

  return (
    <nav aria-label="On this page"
      class="bg-surface xl:bg-transparent border border-rim xl:border-0
             rounded-xl xl:rounded-none p-3 xl:p-0">
      <button type="button" onClick={() => setOpen((v) => !v)}
        class="flex items-center justify-between w-full xl:cursor-default">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">On this page</span>
        <span class="xl:hidden text-muted text-xs">{open() ? "▲" : "▼"}</span>
      </button>
      <Show when={open()}>
        <div class="mt-2 space-y-0.5 max-h-[40vh] xl:max-h-[60vh] overflow-y-auto">
          <For each={props.entries}>
            {(e) => (
              <a href={`#${e.id}`}
                onClick={(ev) => {
                  ev.preventDefault();
                  document.getElementById(e.id)?.scrollIntoView({ behavior: "smooth" });
                  if (window.innerWidth < 1280) setOpen(false);
                }}
                class={`block text-xs py-0.5 px-1 rounded transition-colors truncate ${indent(e.level)}
                  ${props.activeId === e.id ? "text-accent font-medium" : "text-muted hover:text-txt"}`}>
                {e.text}
              </a>
            )}
          </For>
        </div>
      </Show>
    </nav>
  );
}

// ── Nav tree ──────────────────────────────────────────────────────────────────

function NavItem(props: {
  node: NavNode;
  section: string;
  lang: string;
  activePath: string;
  depth: number;
}) {
  const isActive = () => props.activePath === props.node.path;
  const anyChildActive = () => props.activePath.startsWith(props.node.path + "/");
  const [open, setOpen] = createSignal(isActive() || anyChildActive());

  // Keep open when a child becomes active
  createEffect(() => { if (anyChildActive()) setOpen(true); });

  const href = `/help/${props.section}/${props.lang}/${props.node.path}`;
  const hasChildren = props.node.children.length > 0;
  const indent = `${props.depth * 12}px`;

  return (
    <li>
      <div class="flex items-center gap-1" style={{ "padding-left": indent }}>
        {/* Expand toggle — only shown when has children */}
        <Show when={hasChildren}
          fallback={<span class="w-4 shrink-0" />}>
          <button type="button"
            onClick={() => setOpen((v) => !v)}
            class="w-4 h-4 shrink-0 flex items-center justify-center
                   text-subtle hover:text-txt transition-colors rounded">
            <svg class={`w-2.5 h-2.5 transition-transform ${open() ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Show>

        <Show when={props.node.hasContent}
          fallback={
            <button type="button" onClick={() => setOpen((v) => !v)}
              class={`flex-1 text-left text-xs py-1 px-1.5 rounded transition-colors
                ${isActive() ? "text-accent font-semibold" : "text-muted hover:text-txt font-medium"}`}>
              {props.node.label}
            </button>
          }>
          <A href={href}
            class={`flex-1 text-xs py-1 px-1.5 rounded transition-colors truncate
              ${isActive()
                ? "text-accent font-semibold bg-accent-muted"
                : "text-muted hover:text-txt hover:bg-elevated"}`}>
            {props.node.label}
          </A>
        </Show>
      </div>

      <Show when={hasChildren && open()}>
        <ul class="mt-0.5">
          <For each={props.node.children}>
            {(child) => (
              <NavItem
                node={child}
                section={props.section}
                lang={props.lang}
                activePath={props.activePath}
                depth={props.depth + 1}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}

function DocNav(props: {
  section: string;
  lang: string;
  activePath: string;
  langs: string[];
  onLangChange: (l: string) => void;
}) {
  const [navData] = createResource(
    () => ({ section: props.section, lang: props.lang }),
    ({ section, lang }) => fetchNav(section, lang),
  );

  return (
    <nav aria-label="Documentation navigation"
      class="w-56 shrink-0 space-y-4">

      {/* Section switcher */}
      <div class="flex gap-1 p-1 bg-elevated rounded-lg">
        {(["user", "dev"] as const).map((s) => (
          <A href={`/help/${s}/${props.lang}`}
            class={`flex-1 text-center text-xs py-1 rounded-md transition-colors font-medium
              ${props.section === s
                ? "bg-accent text-accent-txt"
                : "text-muted hover:text-txt"}`}>
            {s === "user" ? "User" : "Developer"}
          </A>
        ))}
      </div>

      {/* Language switcher */}
      <Show when={props.langs.length > 1}>
        <div class="flex gap-1 flex-wrap">
          <For each={props.langs}>
            {(l) => (
              <button type="button"
                onClick={() => props.onLangChange(l)}
                class={`px-2 py-0.5 text-xs rounded border transition-colors
                  ${props.lang === l
                    ? "border-accent text-accent bg-accent-muted"
                    : "border-rim text-muted hover:border-rim-strong hover:text-txt"}`}>
                {l.toUpperCase()}
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Tree */}
      <Show when={!navData.loading} fallback={<NavSkeleton />}>
        <Show when={navData()}>
          {(d) => (
            <ul class="space-y-0.5">
              <For each={d().tree}>
                {(node) => (
                  <NavItem
                    node={node}
                    section={props.section}
                    lang={props.lang}
                    activePath={props.activePath}
                    depth={0}
                  />
                )}
              </For>
            </ul>
          )}
        </Show>
      </Show>
    </nav>
  );
}

function NavSkeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <For each={Array(6).fill(0)}>
        {(_, i) => (
          <div class="h-3 bg-elevated rounded"
            style={{ width: `${60 + (i() % 3) * 15}%`, "margin-left": `${(i() % 2) * 12}px` }} />
        )}
      </For>
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
          {() => <div class="h-3 bg-elevated rounded" style={{ width: `${50 + Math.random() * 50}%` }} />}
        </For>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HelpView() {
  // Route: /help/:section/:lang/*topic
  const params  = useParams<{ section: string; lang: string; topic: string }>();
  const navigate = useNavigate();

  const section = () => params.section || "user";
  const lang    = () => params.lang || "en";
  const topic   = () => params.topic || "";

  const [langs, setLangs] = createSignal<string[]>([]);

  const [topicData] = createResource(
    () => ({ section: section(), lang: lang(), topic: topic() }),
    ({ section, lang, topic }) => fetchTopic(section, lang, topic),
  );

  // Keep langs list updated from topic response
  createEffect(() => {
    const d = topicData();
    if (d?.langs?.length) setLangs(d.langs);
  });

  const rendered = () =>
    topicData()?.html
      ? DOMPurify.sanitize(topicData()!.html)
      : "";

  // TOC
  const [toc, setToc] = createSignal<TocEntry[]>([]);
  const [activeId, setActiveId] = createSignal("");
  let bodyRef: HTMLDivElement | undefined;

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
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
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

  function switchLang(l: string) {
    navigate(`/help/${section()}/${l}/${topic()}`);
  }

  return (
    <div class="max-w-6xl mx-auto py-4">
      <div class="flex gap-6">

        {/* ── Sidebar nav ── */}
        <div class="hidden md:block">
          <div class="sticky top-20">
            <DocNav
              section={section()}
              lang={lang()}
              activePath={topic()}
              langs={langs()}
              onLangChange={switchLang}
            />
          </div>
        </div>

        {/* ── Content ── */}
        <div class="flex-1 min-w-0 xl:flex xl:gap-8">
          <article class="flex-1 min-w-0 space-y-5">

            <Show when={topicData.loading}>
              <ContentSkeleton />
            </Show>

            <Show when={topicData.error}>
              <div class="bg-surface border border-rim rounded-xl p-8 text-center space-y-3">
                <p class="text-sm text-red-500">
                  {topicData.error?.message ?? "Page not found."}
                </p>
                <A href={`/help/${section()}/${lang()}`} class="text-sm text-accent hover:underline">
                  ← Back
                </A>
              </div>
            </Show>

            <Show when={!topicData.loading && topicData()}>
              {(d) => (
                <>
                  {/* TOC inline on small screens */}
                  <Show when={toc().length > 2}>
                    <div class="xl:hidden">
                      <TableOfContents entries={toc()} activeId={activeId()} />
                    </div>
                  </Show>
						      <div>{d().title}</div>
                  {/* Body */}
                  <div
                    ref={bodyRef}
                    class="prose dark:prose-invert max-w-none
                           prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                           prose-blockquote:not-italic prose-blockquote:border-accent
                           prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-sm
                           prose-img:rounded-lg break-words"
                    innerHTML={rendered()}
                  />
                </>
              )}
            </Show>
          </article>

          {/* ── Floating TOC sidebar (xl+) ── */}
          <Show when={toc().length > 2}>
            <aside class="hidden xl:block shrink-0 w-48">
              <div class="sticky top-20">
                <TableOfContents entries={toc()} activeId={activeId()} />
              </div>
            </aside>
          </Show>
        </div>
      </div>
    </div>
  );
}
