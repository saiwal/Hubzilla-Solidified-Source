// src/modules/articles/views/ArticlesView.tsx
import { createEffect, createSignal, onMount, Show, For } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { Portal } from "solid-js/web";
import { useAuth } from "@/shared/store/auth-store";
import { useViewerRole } from "@/shared/store/site-config";
import { BiRegularEdit, BiRegularX } from "solid-icons/bi";
import ArticleComposer from "@/shared/editor/composers/ArticleComposer";import {
  posts, loading, hasMore,
  loadArticles, resetPosts, loadMore,
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

function ArticleCard(props: { post: Post; nick: string; onOpen: () => void }) {
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

      <div class="flex items-center gap-3 pt-1 text-xs text-muted">
        <span>{formatDate(props.post.created)}</span>
        <span>·</span>
        <span>{props.post.authorName}</span>
        <Show when={props.post.likeCount > 0}>
          <span>·</span>
          <span>♥ {props.post.likeCount}</span>
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
// Separate component so onMount fires after the dialog is connected to the DOM.

function ArticleModal(props: {
  uid: number;
  nick: string;
  onClose: () => void;
}) {
  let dialogRef: HTMLDialogElement | undefined;

  onMount(() => dialogRef?.showModal());

  const close = () => {
    dialogRef?.close();
    props.onClose();
  };

  return (
    <Portal mount={document.body}>
      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef) close(); }}
        class="m-auto w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl
               bg-base border border-rim shadow-xl p-0 backdrop:bg-black/50"
      >
        <div class="flex items-center justify-between px-4 py-3 border-b border-rim sticky top-0 bg-base z-10">
          <h2 class="text-sm font-semibold text-txt">New article</h2>
          <button
            type="button"
            onClick={close}
            class="p-1 rounded text-muted hover:bg-elevated transition-colors"
          >
            <BiRegularX class="w-5 h-5" />
          </button>
        </div>
        <ArticleComposer
          profileUid={props.uid}
          onSaved={() => {
            close();
            resetPosts();
            loadArticles(props.nick);
          }}
        />
      </dialog>
    </Portal>
  );
}

export default function ArticlesView() {
  const auth = useAuth();
  const role = useViewerRole();
  const params = useParams<{ nick: string }>();
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  let initialized = false;

  createEffect(() => {
    if (auth.loading) return;
    if (initialized) return;
    initialized = true;
    resetPosts();
    loadArticles(params.nick);
  });

  const goToArticle = (uuid: string) => {
    navigate(`/articles/${params.nick}/${uuid}`);
  };

  return (
    <div class="space-y-6">
      {/* ── Header row ── */}
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold text-txt">Articles</h1>

        <Show when={role() === "owner"}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                   rounded-lg bg-accent text-accent-txt hover:opacity-90
                   transition-opacity"
          >
            <BiRegularEdit class="w-4 h-4" />
            New article
          </button>
        </Show>
      </div>

      {/* ── List ── */}
      <Show when={!loading()} fallback={<ArticlesListSkeleton />}>
        <Show
          when={posts().length > 0}
          fallback={
            <div class="text-center py-16 text-muted text-sm space-y-2">
              <p class="text-2xl">📝</p>
              <p>No articles yet.</p>
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
                Load more
              </button>
            </div>
          </Show>

          <Show when={!hasMore()}>
            <p class="text-center py-2 text-xs text-muted">All articles loaded</p>
          </Show>
        </Show>
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
