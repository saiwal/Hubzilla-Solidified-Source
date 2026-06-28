// src/modules/articles/views/ArticlesView.tsx
import { createEffect, createSignal, onMount, onCleanup, Show, For, Index } from "solid-js";
import { MdOutlineArticle, MdOutlineShare } from "solid-icons/md";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { useI18n } from "@/i18n";
import { Portal } from "solid-js/web";
import { useAuth } from "@/shared/store/auth-store";
import { useViewerRole } from "@/shared/store/site-config";
import { BiRegularEdit, BiRegularX } from "solid-icons/bi";
import ArticleComposer from "@/shared/editor/composers/ArticleComposer";
import PostComposer from "@/shared/editor/composers/PostComposer";
import {
  posts, loading, hasMore,
  loadArticles, resetPosts, loadMore,
  activeCategory, activeTag, clearArticleFilter,
} from "../store";
import type { Post } from "@/shared/types/post.types";

// ── helpers ───────────────────────────────────────────────────────────────────

function excerpt(post: Post, maxLen = 200): { text: string; fromSummary: boolean } {
  // Prefer explicit summary — it's already plain text
  if (post.summary) {
    const text = post.summary.length <= maxLen
      ? post.summary
      : post.summary.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
    return { text, fromSummary: true };
  }
  // Fall back to body: strip HTML (body is already rendered) then truncate
  const plain = (post.body ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return { text: "", fromSummary: false };
  const text = plain.length <= maxLen
    ? plain
    : plain.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
  return { text, fromSummary: false };
}

function formatDate(iso: string): string {
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── card ──────────────────────────────────────────────────────────────────────

function ArticleCard(props: { post: Post; nick: string; onOpen: () => void; onShare?: () => void }) {
  const { t } = useI18n();
  const ex = () => excerpt(props.post);

  return (
    <article
      onClick={props.onOpen}
      class="group bg-surface border border-rim rounded-xl p-5 space-y-2
             hover:border-rim-strong hover:bg-elevated cursor-pointer
             transition-colors"
    >
      <h2 class="text-lg font-semibold text-txt leading-snug
                 group-hover:text-accent transition-colors">
        {props.post.title || "(Untitled)"}
      </h2>

      <Show when={ex().text}>
        <p class={`text-sm leading-relaxed ${ex().fromSummary ? "text-txt" : "text-muted"}`}>
          {ex().text}
        </p>
      </Show>

      <Show when={(props.post.categories?.length ?? 0) > 0 || (props.post.tags?.length ?? 0) > 0}>
        <div class="flex flex-wrap gap-1.5 pt-1">
          <Index each={props.post.categories}>
            {(cat) => (
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                           bg-accent/15 text-accent border border-accent/30">
                {cat()}
              </span>
            )}
          </Index>
          <Index each={props.post.tags}>
            {(tag) => (
              <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                           bg-elevated text-muted border border-rim">
                #{tag()}
              </span>
            )}
          </Index>
        </div>
      </Show>

      <div class="flex items-center gap-3 pt-1 text-xs text-muted">
        <span>{formatDate(props.post.created)}</span>
        <span>·</span>
        <span>{props.post.authorName}</span>
        <Show when={props.post.likeCount > 0}>
          <span>·</span>
          <span>♥ {props.post.likeCount}</span>
        </Show>
        <Show when={props.onShare}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); props.onShare!(); }}
            title={t("articles.share")}
            class="ml-auto p-1 rounded-md text-muted hover:text-accent hover:bg-accent/10
                   transition-colors opacity-0 group-hover:opacity-100"
          >
            <MdOutlineShare size={15} />
          </button>
        </Show>
      </div>
    </article>
  );
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function ArticlesListSkeleton() {
  return (
    <div class="space-y-4">
      <For each={Array(6).fill(0)}>
        {() => (
          <div class="bg-surface border border-rim rounded-xl p-5 space-y-3 animate-pulse">
            <div class="h-5 bg-elevated rounded w-2/3" />
            <div class="space-y-1.5">
              <div class="h-3 bg-elevated rounded w-full" />
              <div class="h-3 bg-elevated rounded w-4/5" />
            </div>
            <div class="h-3 bg-elevated rounded w-1/3" />
          </div>
        )}
      </For>
    </div>
  );
}



// ── modal wrapper ─────────────────────────────────────────────────────────────
// Uses a div-based modal (not <dialog>) so AclPicker's portaled dropdown
// stays in the normal stacking context and can appear above the overlay.

function ArticleModal(props: {
  uid: number;
  nick: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  onMount(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

  return (
    <Portal mount={document.body}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 bg-black/50"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        {/* Panel */}
        <div class="relative w-full max-w-3xl rounded-xl bg-base border border-rim shadow-xl">
          <div class="flex items-center justify-between px-4 py-3 border-b border-rim sticky top-0 bg-base z-10 rounded-t-xl">
            <h2 class="text-sm font-semibold text-txt">{t("articles.new_article")}</h2>
            <button
              type="button"
              onClick={props.onClose}
              class="p-1 rounded text-muted hover:bg-elevated transition-colors"
            >
              <BiRegularX class="w-5 h-5" />
            </button>
          </div>
          <ArticleComposer
            profileUid={props.uid}
            nick={props.nick}
            onSaved={() => {
              props.onClose();
              resetPosts();
              loadArticles(props.nick);
            }}
          />
        </div>
      </div>
    </Portal>
  );
}

function buildArticleShareBody(title: string, summary: string): string {
  let body = `[b]${title}[/b]`;
  if (summary) body += `\n\n${summary}`;
  return body;
}

export default function ArticlesView() {
  const auth = useAuth();
  const role = useViewerRole();
  const { t } = useI18n();
  const params = useParams<{ nick: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  const [sharePost, setSharePost] = createSignal<Post | null>(null);
  const [searchParams] = useSearchParams();
  let initialized = false;

  createEffect(() => {
    if (auth.loading) return;
    if (initialized) return;
    initialized = true;
    resetPosts();
    loadArticles(params.nick);
    if (searchParams.new === "1" && role() === "owner") setOpen(true);
  });

  const goToArticle = (uuid: string) => {
    navigate(`/articles/${params.nick}/${uuid}`);
  };

  return (
    <div class="space-y-6 max-w-2xl mx-auto ">
      {/* ── Header row ── */}
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-txt">{t("articles.title")}</h1>

        <Show when={role() === "owner"}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                   rounded-lg bg-accent text-accent-fg hover:opacity-90
                   transition-opacity"
          >
            <BiRegularEdit class="w-4 h-4" />
            {t("articles.new_article")}
          </button>
        </Show>
      </div>

      {/* ── Active filter banner ── */}
      <Show when={activeCategory() || activeTag()}>
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/25 text-sm">
          <span class="text-muted">{t("articles.filtered_by")}</span>
          <Show when={activeCategory()}>
            <span class="font-medium text-accent">{activeCategory()}</span>
          </Show>
          <Show when={activeTag()}>
            <span class="font-medium text-accent">#{activeTag()}</span>
          </Show>
          <button
            type="button"
            onClick={clearArticleFilter}
            class="ml-auto text-xs text-muted hover:text-txt transition-colors"
          >
            {t("articles.clear")}
          </button>
        </div>
      </Show>

      {/* ── List ── */}
      <Show when={!loading()} fallback={<ArticlesListSkeleton />}>
        <Show
          when={posts().length > 0}
          fallback={
            <div class="text-center py-16 text-muted text-sm space-y-2">
              <MdOutlineArticle class="text-2xl text-muted mx-auto" />
              <p>{t("articles.no_articles")}</p>
            </div>
          }
        >
          <div class="space-y-4">
            <For each={posts()}>
              {(post) => (
                <ArticleCard
                  post={post}
                  nick={params.nick}
                  onOpen={() => goToArticle(post.uuid)}
                  onShare={auth() ? () => setSharePost(post) : undefined}
                />
              )}
            </For>
          </div>

          <Show when={hasMore()}>
            <div class="flex justify-center pt-2">
              <button
                onClick={loadMore}
                class="px-4 py-2 text-sm font-medium rounded-lg border border-rim
                       bg-surface text-muted hover:bg-elevated transition-colors"
              >
                {t("articles.load_more")}
              </button>
            </div>
          </Show>

          <Show when={!hasMore()}>
            <p class="text-center py-2 text-xs text-muted">{t("articles.all_loaded")}</p>
          </Show>
        </Show>
      </Show>

      {/* ── Share composer ── */}
      <Show when={sharePost() !== null}>
        <PostComposer
          open={true}
          onClose={() => setSharePost(null)}
          profileUid={auth()?.uid ?? 0}
          initialBody={buildArticleShareBody(sharePost()!.title, sharePost()!.summary ?? "")}
        />
      </Show>

      {/* ── Compose modal ── */}
      <Show when={open()}>
        <ArticleModal
          uid={auth()!.uid}
          nick={params.nick}
          onClose={() => setOpen(false)}
        />
      </Show>
    </div>
  );
}
