import { createResource, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { fetchArticle } from "../api";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import DOMPurify from "dompurify";
import { usePageNick } from "@/shared/store/site-config";

export default function ArticleView() {
  const params = useParams<{ nick: string; uuid: string }>();
  const pageNick = usePageNick();

  const nick = () => params.nick || pageNick();

  const [data] = createResource(
    () => ({ nick: nick(), uuid: params.uuid }),
    ({ nick, uuid }) => fetchArticle(nick, uuid)
  );

  const rendered = () =>
    data()?.article
      ? DOMPurify.sanitize(bbcodeToHtml(data()!.article.body ?? ""))
      : "";

  return (
    <div class="max-w-3xl mx-auto">
      <Show when={!data.loading && data()} fallback={<ArticleViewSkeleton />}>
        {(d) => (
          <article class="space-y-6">
            {/* Back link */}
            <A
              href={`/articles/${nick()}`}
              class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800
                     dark:hover:text-gray-200 transition-colors"
            >
              ← All articles
            </A>

            {/* Header */}
            <header class="space-y-2">
              <h1 class="text-3xl font-bold leading-tight">
                {d().article.title || "(Untitled)"}
              </h1>
              <p class="text-sm text-muted">
                {new Date(d().article.created.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
                  year: "numeric", month: "long", day: "numeric",
                })}
                {" by "}
                <a href={d().article.authorUrl} class="hover:underline">
                  {d().article.authorName}
                </a>
              </p>
            </header>

            {/* Body */}
            <div
              class="prose dark:prose-invert max-w-none"
              // eslint-disable-next-line solid/no-innerhtml
              innerHTML={rendered()}
            />

            {/* Reactions */}
            <div class="flex gap-4 text-sm text-gray-500 border-t border-rim pt-4">
              <span>♥ {d().article.likeCount} likes</span>
              <span>👎 {d().article.dislikeCount} dislikes</span>
              <span>🔁 {d().article.repeatCount} repeats</span>
            </div>

            {/* Comments */}
            <section class="space-y-4">
              <h2 class="text-lg font-semibold">
                Comments ({d().comments.length})
              </h2>
              <Show when={d().comments.length > 0} fallback={
                <p class="text-sm text-gray-400">No comments yet.</p>
              }>
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
                      <div class="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1">
                        <div class="flex items-center gap-2 text-xs text-gray-500">
                          <span class="font-medium text-gray-800 dark:text-gray-200">
                            {c.authorName}
                          </span>
                          <span>
                            {new Date(c.created.replace(" ", "T") + "Z").toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          class="text-sm prose dark:prose-invert max-w-none"
                          innerHTML={DOMPurify.sanitize(bbcodeToHtml(c.body ?? ""))}
                        />
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </section>
          </article>
        )}
      </Show>
    </div>
  );
}

function ArticleViewSkeleton() {
  return (
    <div class="space-y-6 animate-pulse">
      <div class="h-4 bg-elevated rounded w-24" />
      <div class="space-y-3">
        <div class="h-8 bg-elevated rounded w-3/4" />
        <div class="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-1/3" />
      </div>
      <div class="space-y-2">
        {Array(8).fill(0).map(() => (
          <div class="h-3 bg-gray-100 dark:bg-gray-700/60 rounded w-full" />
        ))}
      </div>
    </div>
  );
}
