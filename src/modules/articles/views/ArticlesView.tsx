import { createEffect, Show, For, onCleanup } from "solid-js";
import { useParams, useSearchParams, A } from "@solidjs/router";
import { usePageNick } from "@/shared/store/site-config";
import {
  articles, loading, loadingMore, hasMore,
  loadArticles, loadMoreArticles,
} from "../store";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import DOMPurify from "dompurify";

export default function ArticlesView() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageNick = usePageNick();

  const nick = () => params.nick || pageNick();
const filterParams = () => ({
  search: [searchParams.search].flat()[0] || undefined,
  tag:    [searchParams.tag].flat()[0]    || undefined,
  cat:    [searchParams.cat].flat()[0]    || undefined,
});

  createEffect(() => {
    const n = nick();
    if (!n) return;
    loadArticles(n, filterParams());
  });

  onCleanup(() => {
    // reset on leave so back-nav gets fresh data for a different channel
  });

  return (
    <div class="max-w-3xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Articles</h1>
        {/* Search */}
        <input
          type="search"
          placeholder="Search articles…"
          value={searchParams.search ?? ""}
          onInput={(e) => {
            setSearchParams({ search: e.currentTarget.value || undefined }, { replace: true });
            loadArticles(nick(), { ...filterParams(), search: e.currentTarget.value || undefined });
          }}
          class="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm
                 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Show when={!loading()} fallback={<ArticlesPlaceholder />}>
        <Show when={articles().length > 0} fallback={
          <p class="text-center py-12 text-gray-400">No articles yet.</p>
        }>
          <For each={articles()}>
            {(article) => <ArticleCard article={article} nick={nick()} />}
          </For>
        </Show>

        <Show when={loadingMore()}>
          <ArticlesPlaceholder count={3} />
        </Show>

        <Show when={hasMore() && !loadingMore()}>
          <div class="flex justify-center py-4">
            <button
              onClick={() => loadMoreArticles(filterParams())}
              class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Load more
            </button>
          </div>
        </Show>

        <Show when={!hasMore() && articles().length > 0}>
          <p class="text-center py-4 text-sm text-gray-400">All caught up</p>
        </Show>
      </Show>
    </div>
  );
}

function ArticleCard(props: { article: import("@/shared/types/post.types").Post; nick: string }) {
  // Render a short excerpt — first ~300 chars of rendered body, stripped of HTML
  const excerpt = () => {
    const raw = DOMPurify.sanitize(bbcodeToHtml(props.article.body ?? ""), { ALLOWED_TAGS: [] });
    return raw.length > 280 ? raw.slice(0, 280) + "…" : raw;
  };

  return (
    <article class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-2 hover:shadow-sm transition-shadow">
      <A href={`/articles/${props.nick}/${props.article.uuid}`} class="block">
        <h2 class="text-lg font-semibold leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          {props.article.title || "(Untitled)"}
        </h2>
      </A>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {new Date(props.article.created.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
          year: "numeric", month: "long", day: "numeric",
        })}
        {" · "}
        {props.article.authorName}
      </p>
      <p class="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{excerpt()}</p>
      <div class="flex items-center gap-4 pt-1 text-xs text-gray-400">
        <span>♥ {props.article.likeCount}</span>
        <span>💬 {props.article.commentCount ?? 0}</span>
        <A
          href={`/articles/${props.nick}/${props.article.uuid}`}
          class="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          Read →
        </A>
      </div>
    </article>
  );
}

function ArticlesPlaceholder(props: { count?: number }) {
  return (
    <For each={Array(props.count ?? 5).fill(0)}>
      {() => (
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3 animate-pulse">
          <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div class="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-1/4" />
          <div class="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-full" />
          <div class="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-5/6" />
        </div>
      )}
    </For>
  );
}
