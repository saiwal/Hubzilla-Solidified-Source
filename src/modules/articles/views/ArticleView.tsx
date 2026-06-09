// src/modules/articles/views/ArticleView.tsx
import {
  createResource, createSignal, createEffect, onCleanup, onMount,
  Show, For
} from "solid-js";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";
import { useParams, A, useNavigate } from "@solidjs/router";
import { Portal } from "solid-js/web";
import { fetchArticle, deleteArticle } from "../api";
import ArticleComposer from "@/shared/editor/composers/ArticleComposer";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import DOMPurify from "dompurify";
import { usePageNick, useViewerRole } from "@/shared/store/site-config";
import { useAuth } from "@/shared/store/auth-store";
import { BiRegularEdit, BiRegularTrash } from "solid-icons/bi";
import {
  MdOutlineThumb_up,
  MdOutlineThumb_down,
  MdFillShare,
  MdFillChat,
} from "solid-icons/md";
import { apiToggleLike, apiToggleDislike, apiToggleRepeat } from "@/shared/lib/item-api";
import type { Post } from "@/shared/types/post.types";

// ── types ─────────────────────────────────────────────────────────────────────

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function extractHeadings(container: HTMLElement): TocEntry[] {
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

// ── TOC ───────────────────────────────────────────────────────────────────────

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
      aria-label="Table of contents"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        class="flex items-center justify-between w-full xl:cursor-default"
      >
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          {t("articles.on_this_page")}
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

// ── edit modal ────────────────────────────────────────────────────────────────

function EditModal(props: {
  article: { uuid: string; title: string; summary?: string; slug?: string; category?: string; body: string };
  nick: string;
  profileUid: number;
  onSaved: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
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
          <h2 class="text-sm font-semibold text-txt">{t("articles.edit_article")}</h2>
          <button
            type="button"
            onClick={close}
            class="p-1 rounded text-muted hover:bg-elevated transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <ArticleComposer
          profileUid={props.profileUid}
          nick={props.nick}
          initial={{
            uuid:     props.article.uuid,
            title:    props.article.title,
            summary:  props.article.summary ?? "",
            slug:     props.article.slug    ?? "",
            category: props.article.category ?? "",
            body:     props.article.body,
          }}
          onSaved={() => {
            close();
            props.onSaved();
          }}
        />
      </dialog>
    </Portal>
  );
}

// ── delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm(props: { uuid: string; onDeleted: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [deleting, setDeleting] = createSignal(false);

  const confirm = async () => {
    setDeleting(true);
    try {
      await deleteArticle(props.uuid);
      props.onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("articles.delete_failed"));
      setDeleting(false);
    }
  };

  return (
    <div class="flex items-center gap-3 px-4 py-3 bg-surface border border-rim rounded-xl">
      <p class="text-sm text-txt flex-1">
        {t("articles.delete_confirm")}
      </p>
      <button
        type="button"
        onClick={props.onCancel}
        class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted hover:bg-elevated transition-colors"
      >
        {t("articles.cancel")}
      </button>
      <button
        type="button"
        onClick={confirm}
        disabled={deleting()}
        class="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-500 text-white
               hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {deleting() ? t("articles.deleting") : t("articles.delete")}
      </button>
    </div>
  );
}

// ── main view ─────────────────────────────────────────────────────────────────

export default function ArticleView() {
  const params = useParams<{ nick: string; uuid: string }>();
  const pageNick = usePageNick();
  const nick = () => params.nick || pageNick();
  const role = useViewerRole();
  const auth = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [data, { refetch }] = createResource(
    () => ({ nick: nick(), uuid: params.uuid }),
    ({ nick, uuid }) => fetchArticle(nick, uuid),
  );

  const rendered = () =>
    data()?.article ? DOMPurify.sanitize(data()!.article.body ?? "") : "";

  // editing / deleting state
  const [editing, setEditing] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);

  // Reaction state — optimistic local copy initialised from fetched article
  const [reactions, setReactions] = createSignal({
    likeCount: 0, dislikeCount: 0, repeatCount: 0,
    viewerLiked: false, viewerDisliked: false, viewerRepeated: false,
  });
  createEffect(() => {
    const art = data()?.article;
    if (!art) return;
    setReactions({
      likeCount: art.likeCount,
      dislikeCount: art.dislikeCount,
      repeatCount: art.repeatCount,
      viewerLiked: art.viewerLiked,
      viewerDisliked: art.viewerDisliked,
      viewerRepeated: art.viewerRepeated,
    });
  });

  // Local comments list — updated optimistically when a new comment is posted
  const [localComments, setLocalComments] = createSignal<Post[]>([]);
  createEffect(() => {
    if (data()?.comments) setLocalComments(data()!.comments);
  });

  // Comment composer visibility
  const [replyOpen, setReplyOpen] = createSignal(false);

  function handleLike() {
    const art = data()?.article;
    if (!art?.uuid) return;
    const wasLiked = reactions().viewerLiked;
    const delta = wasLiked ? -1 : 1;
    setReactions(r => ({ ...r, viewerLiked: !wasLiked, likeCount: r.likeCount + delta }));
    apiToggleLike(art.uuid).then(res => {
      setReactions(r => ({ ...r, likeCount: res.like_count, viewerLiked: res.state === "added" }));
    }).catch(() => {
      setReactions(r => ({ ...r, viewerLiked: wasLiked, likeCount: r.likeCount - delta }));
    });
  }

  function handleDislike() {
    const art = data()?.article;
    if (!art?.uuid) return;
    const wasDisliked = reactions().viewerDisliked;
    const delta = wasDisliked ? -1 : 1;
    setReactions(r => ({ ...r, viewerDisliked: !wasDisliked, dislikeCount: r.dislikeCount + delta }));
    apiToggleDislike(art.uuid).then(res => {
      setReactions(r => ({ ...r, dislikeCount: res.dislike_count, viewerDisliked: res.state === "added" }));
    }).catch(() => {
      setReactions(r => ({ ...r, viewerDisliked: wasDisliked, dislikeCount: r.dislikeCount - delta }));
    });
  }

  function handleRepeat() {
    const art = data()?.article;
    if (!art?.uuid || reactions().viewerRepeated) return;
    setReactions(r => ({ ...r, viewerRepeated: true, repeatCount: r.repeatCount + 1 }));
    apiToggleRepeat(art.uuid).catch(() => {
      setReactions(r => ({ ...r, viewerRepeated: false, repeatCount: r.repeatCount - 1 }));
    });
  }

  // TOC
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

  const isOwner = () => role() === "owner";

  return (
    <div class="relative max-w-5xl mx-auto py-4">
      <Show when={!data.loading && data()} fallback={<ArticleViewSkeleton />}>
        {(d) => (
          <div class="xl:flex xl:gap-8">
            {/* ── Article ── */}
            <article class="min-w-0 flex-1 max-w-3xl space-y-6">
              {/* Back link */}
              <A
                href={`/articles/${nick()}`}
                class="inline-flex items-center gap-1 text-sm text-muted hover:text-txt transition-colors"
              >
                {t("articles.all_articles")}
              </A>

              {/* Delete confirm banner */}
              <Show when={confirmDelete()}>
                <DeleteConfirm
                  uuid={d().article.uuid}
                  onDeleted={() => navigate(`/articles/${nick()}`)}
                  onCancel={() => setConfirmDelete(false)}
                />
              </Show>

              {/* Edit modal */}
              <Show when={editing()}>
                <EditModal
                  article={{
                    uuid:     d().article.uuid,
                    title:    d().article.title,
                    summary:  d().article.summary,
                    body:     d().article.body ?? "",
                  }}
                  nick={nick()}
                  profileUid={auth()!.uid}
                  onSaved={() => { setEditing(false); refetch(); }}
                  onClose={() => setEditing(false)}
                />
              </Show>

              {/* Normal view */}
              <Show when={!editing()}>
                {/* Header */}
                <header class="space-y-2 border-b border-rim pb-4">
                  <div class="flex items-start justify-between gap-4">
                    <h1 class="text-3xl font-bold leading-tight text-txt">
                      {d().article.title || "(Untitled)"}
                    </h1>
                    {/* Owner actions */}
                    <Show when={isOwner()}>
                      <div class="flex items-center gap-1 shrink-0 pt-1">
                        <button
                          type="button"
                          onClick={() => { setConfirmDelete(false); setEditing(true); }}
                          title="Edit article"
                          class="p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
                        >
                          <BiRegularEdit class="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditing(false); setConfirmDelete(true); }}
                          title="Delete article"
                          class="p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-red-500 transition-colors"
                        >
                          <BiRegularTrash class="w-4 h-4" />
                        </button>
                      </div>
                    </Show>
                  </div>

                  <Show when={d().article.summary}>
                    <p class="text-lg text-muted italic leading-snug">
                      {d().article.summary}
                    </p>
                  </Show>
                  <p class="text-sm text-muted">
                    {new Date(
                      d().article.created.replace(" ", "T") + "Z",
                    ).toLocaleDateString(undefined, {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                    {" "}{t("articles.by")}{" "}
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

                {/* Body */}
                <div
                  ref={bodyRef}
                  class="prose dark:prose-invert max-w-none"
                  // eslint-disable-next-line solid/no-innerhtml
                  innerHTML={rendered()}
                />

                {/* Reactions / action bar */}
                <div class="flex items-center gap-1 pt-4 border-t border-rim flex-wrap">
                  <button
                    onClick={handleLike}
                    title="Like"
                    class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                           transition-colors select-none hover:bg-overlay
                           ${reactions().viewerLiked ? "text-accent" : "text-muted"}`}
                  >
                    <MdOutlineThumb_up size={17} />
                    <Show when={reactions().likeCount > 0}>
                      <span>{reactions().likeCount}</span>
                    </Show>
                  </button>

                  <button
                    onClick={handleDislike}
                    title="Dislike"
                    class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                           transition-colors select-none hover:bg-overlay
                           ${reactions().viewerDisliked ? "text-accent" : "text-muted"}`}
                  >
                    <MdOutlineThumb_down size={17} />
                    <Show when={reactions().dislikeCount > 0}>
                      <span>{reactions().dislikeCount}</span>
                    </Show>
                  </button>

                  <button
                    onClick={handleRepeat}
                    title="Repeat"
                    class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                           transition-colors select-none hover:bg-overlay
                           ${reactions().viewerRepeated ? "text-accent" : "text-muted"}`}
                  >
                    <MdFillShare size={17} />
                    <Show when={reactions().repeatCount > 0}>
                      <span>{reactions().repeatCount}</span>
                    </Show>
                  </button>

                  <Show when={auth()?.isLocal}>
                    <button
                      onClick={() => setReplyOpen(v => !v)}
                      class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             text-muted hover:bg-overlay hover:text-txt transition-colors"
                    >
                      <MdFillChat size={17} />
                      <span>{t("articles.comment")}</span>
                    </button>
                  </Show>
                </div>

                {/* Comment composer */}
                <Show when={replyOpen() && d().article.iid && d().article.profileUid}>
                  <CommentComposer
                    parentMid={d().article.mid}
                    parentIid={d().article.iid!}
                    profileUid={d().article.profileUid!}
                    onSubmitted={(body) => {
                      const a = auth();
                      setLocalComments(prev => [...prev, {
                        uuid: crypto.randomUUID(), id: "", mid: crypto.randomUUID(),
                        parent_mid: d().article.mid, thr_parent: d().article.mid,
                        top_mid: d().article.mid, parent: d().article.mid,
                        body, title: "",
                        authorName: a?.nick ?? "You",
                        authorAvatar: "",
                        authorUrl: "",
                        created: new Date().toISOString().replace("T", " ").slice(0, 19),
                        verb: "Create", obj_type: "Note", flags: [], permalink: "",
                        likeCount: 0, dislikeCount: 0, repeatCount: 0,
                        viewerLiked: false, viewerDisliked: false, viewerRepeated: false,
                        item_thread_top: 0, children: [],
                      } satisfies Post]);
                      setReplyOpen(false);
                    }}
                  />
                </Show>

                {/* Comments */}
                <section class="space-y-4">
                  <h2 class="text-base font-semibold text-txt">
                    {t("articles.comments")} ({localComments().length})
                  </h2>
                  <Show
                    when={localComments().length > 0}
                    fallback={<p class="text-sm text-muted">{t("articles.no_comments")}</p>}
                  >
                    <For each={localComments()}>
                      {(c) => (
                        <div class="flex gap-3">
                          <Show
                            when={c.authorAvatar}
                            fallback={
                              <div class="w-8 h-8 rounded-full bg-accent-muted text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                                {c.authorName?.[0]?.toUpperCase() ?? "?"}
                              </div>
                            }
                          >
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
              </Show>
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
