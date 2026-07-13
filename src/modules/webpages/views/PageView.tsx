import { createEffect, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import DOMPurify from "dompurify";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import { hydrateLatex } from "@/shared/lib/hydrateLatex";
import { useToc } from "@/shared/lib/useToc";
import ArticleToc from "@/shared/views/ArticleToc";
import { fetchWebPageByPagelink } from "../api";
import { useI18n } from "@/i18n";

// Renders a Hubzilla webpage inline in the SPA by fetching its body via the
// JSON API. Branches on mimetype so BBCode goes through bbcodeToHtml first,
// HTML is sanitized directly. Markdown support can be added later if needed.
//
// Note: pages with custom Comanche layouts will still render their body content
// correctly here; only the layout chrome (sidebars, regions) is intentionally
// omitted — the page body is what the author actually wrote.

function renderBody(body: string, mimetype: string): string {
  switch (mimetype) {
    case "text/bbcode":
      return DOMPurify.sanitize(bbcodeToHtml(body));
    case "text/html":
      return DOMPurify.sanitize(body);
    case "text/markdown":
      // Markdown: treat as plain text wrapped in <pre> until a Markdown lib is added
      return `<pre class="whitespace-pre-wrap">${DOMPurify.sanitize(body)}</pre>`;
    default:
      return DOMPurify.sanitize(body);
  }
}

export default function PageView() {
  const { t } = useI18n();
  const params = useParams<{ nick: string; path: string }>();

  // params.path is the wildcard segment after /page/:nick/
  const pagelink = () => params.path ?? "";
  const nick = () => params.nick ?? "";

  const [detail] = createQueryResource(
    "webpage",
    () => ({ nick: nick(), pagelink: pagelink() }),
    ({ nick, pagelink }) => fetchWebPageByPagelink(nick, pagelink),
  );

  const rendered = () => {
    const d = detail();
    if (!d) return "";
    return renderBody(d.body ?? "", d.mimetype ?? "text/bbcode");
  };

  let bodyRef: HTMLDivElement | undefined;
  createEffect(() => {
    rendered();
    if (bodyRef) hydrateLatex(bodyRef);
  });
  const { toc, activeId } = useToc(rendered, () => bodyRef);

  return (
    <div class="relative max-w-5xl mx-auto space-y-4 py-4">
      {/* Breadcrumb */}
      <div class="flex items-center gap-2 text-sm text-muted">
        <A
          href={`/webpages/${nick()}`}
          class="hover:text-txt transition-colors"
        >
          {t("webpages.back")}
        </A>
        <span>/</span>
        <span class="font-mono text-muted">{pagelink()}</span>
      </div>

      {/* Loading skeleton */}
      <Show when={detail.loading}>
        <div class="space-y-3 animate-pulse">
          <div class="h-8 bg-elevated rounded w-2/3" />
          <div class="h-3 bg-elevated rounded w-full" />
          <div class="h-3 bg-elevated rounded w-5/6" />
          <div class="h-3 bg-elevated rounded w-full" />
          <div class="h-3 bg-elevated rounded w-4/5" />
        </div>
      </Show>

      {/* Error */}
      <Show when={detail.error}>
        <div class="p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">
          {detail.error?.message ?? t("webpages.load_failed")}
        </div>
      </Show>

      {/* Page content */}
      <Show when={!detail.loading && detail()}>
        <div class="xl:flex xl:gap-8">
          <article class="min-w-0 flex-1 max-w-none xl:max-w-3xl bg-surface rounded-xl border border-rim p-6 space-y-4">
            <Show when={detail()!.title}>
              <h1 class="text-2xl font-bold text-txt">{detail()!.title}</h1>
            </Show>
            <div
              ref={bodyRef}
              class="prose dark:prose-invert max-w-none"
              // eslint-disable-next-line solid/no-innerhtml
              innerHTML={rendered()}
            />
          </article>

          {/* ── TOC — fixed sidebar on xl+, floating collapsed launcher below xl ── */}
          <ArticleToc entries={toc()} activeId={activeId()} label={t("webpages.on_this_page")} />
        </div>
      </Show>
    </div>
  );
}
