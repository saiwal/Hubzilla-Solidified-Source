// src/modules/articles/views/ArticleView.tsx
import {
  createSignal, createEffect, createMemo, onMount,
  Show, For
} from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";
import { useParams, A, useNavigate } from "@solidjs/router";
import { Portal } from "solid-js/web";
import { fetchArticle, deleteArticle } from "../api";
import ArticleComposer from "@/shared/editor/composers/ArticleComposer";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import PostComposer from "@/shared/editor/composers/PostComposer";
import DOMPurify from "dompurify";
import { hydrateLatex } from "@/shared/lib/hydrateLatex";
import { useToc } from "@/shared/lib/useToc";
import ArticleToc from "@/shared/views/ArticleToc";
import { usePageNick, useViewerRole } from "@/shared/store/site-config";
import { useAuth } from "@/shared/store/auth-store";
import { useNavViewer } from "@/shared/store/nav-store";
import { BiRegularEdit, BiRegularTrash } from "solid-icons/bi";
import {
  MdOutlineThumb_up,
  MdOutlineThumb_down,
  MdFillChat,
  MdOutlineShare,
} from "solid-icons/md";
import { apiToggleLike, apiToggleDislike, apiDeleteItem, apiEditItem } from "@/shared/lib/item-api";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import { oembedResolver } from "@/shared/lib/oembedResolver";
import { sanitizeHtml } from "@/shared/lib/sanitize";
import { buildThreadTree, countAllComments, REACTION_VERBS } from "@/shared/lib/thread";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "@/shared/stream/types";
import CommentThread from "@/shared/views/CommentThread";
import type { Post } from "@/shared/types/post.types";

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
  const navViewer = useNavViewer();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [data, { refetch }] = createQueryResource(
    "article-detail",
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
    likeCount: 0, dislikeCount: 0,
    viewerLiked: false, viewerDisliked: false,
  });
  createEffect(() => {
    const art = data()?.article;
    if (!art) return;
    setReactions({
      likeCount: art.likeCount,
      dislikeCount: art.dislikeCount,
      viewerLiked: art.viewerLiked,
      viewerDisliked: art.viewerDisliked,
    });
  });

  // Local comments list — updated optimistically when a new comment is posted
  const [localComments, setLocalComments] = createSignal<Post[]>([]);
  createEffect(() => {
    if (data()?.comments) setLocalComments(data()!.comments);
  });

  // Comment composer visibility
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [shareOpen, setShareOpen] = createSignal(false);

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

  // ── Comment thread ─────────────────────────────────────────────────────────
  // Article + comments -> nested tree, same architecture PostView.tsx uses for
  // single-post pages. Reaction-verb rows (Like/Dislike/Announce) ride along
  // in the comments payload — drop them before building the tree.

  type CommentReactionOverride = {
    viewerLiked?: boolean;
    viewerDisliked?: boolean;
    likeCount?: number;
    dislikeCount?: number;
  };
  const [commentReactions, setCommentReactions] =
    createSignal<Record<string, CommentReactionOverride>>({});

  function findInTree(nodes: ThreadNode[], mid: string): ThreadNode | undefined {
    for (const n of nodes) {
      if (n.mid === mid) return n;
      const found = findInTree(n.children, mid);
      if (found) return found;
    }
    return undefined;
  }

  function applyCommentOverrides(n: ThreadNode): ThreadNode {
    const o = commentReactions()[n.mid];
    return {
      ...(o ? { ...n, ...o } : n),
      children: n.children.map(applyCommentOverrides),
    };
  }

  const rawCommentTree = createMemo((): ThreadNode[] => {
    const art = data()?.article;
    if (!art) return [];
    const realComments = localComments().filter(c => !REACTION_VERBS.has(c.verb ?? ""));
    const tree = buildThreadTree([art, ...realComments]);
    return tree[0]?.children ?? [];
  });

  const commentTree = createMemo(() => rawCommentTree().map(applyCommentOverrides));

  function addLocalComment(parentMid: string, body: string) {
    const art = data()?.article;
    if (!art) return;
    const a = auth();
    const viewer = navViewer();
    let renderedBody = "";
    try {
      const converted = bbcodeToHtml(body, { oembedResolver });
      renderedBody = sanitizeHtml(typeof converted === "string" ? converted : "");
    } catch {
      renderedBody = "";
    }
    const tempId = crypto.randomUUID();
    setLocalComments(prev => [...prev, {
      uuid: tempId, id: tempId, mid: tempId,
      parent_mid: art.mid, thr_parent: parentMid,
      top_mid: art.mid, parent: art.uuid,
      body: renderedBody, rawBody: body, title: "",
      authorName: viewer?.name || a?.nick || "You",
      authorAvatar: viewer?.avatar ?? "",
      authorUrl: viewer?.url ?? "",
      authorAddress: viewer?.addr || (a?.nick ? `${a.nick}@${window.location.hostname}` : ""),
      created: new Date().toISOString().replace("T", " ").slice(0, 19),
      verb: "Create", obj_type: "Note", flags: [], permalink: "",
      likeCount: 0, dislikeCount: 0, repeatCount: 0,
      viewerLiked: false, viewerDisliked: false, viewerRepeated: false,
      item_thread_top: 0, children: [],
    } satisfies Post]);
  }

  function toggleCommentReaction(
    mid: string,
    field: "viewerLiked" | "viewerDisliked",
    countField: "likeCount" | "dislikeCount",
    call: (uuid: string) => Promise<{ like_count?: number; dislike_count?: number; state: string }>,
  ) {
    const node = findInTree(rawCommentTree(), mid);
    if (!node?.uuid) return;
    const o = commentReactions()[mid] ?? {};
    const current = o[field] ?? node[field];
    const count = o[countField] ?? node[countField];
    setCommentReactions(prev => ({
      ...prev,
      [mid]: { ...prev[mid], [field]: !current, [countField]: current ? count - 1 : count + 1 },
    }));
    call(node.uuid).catch(() => {
      setCommentReactions(prev => ({ ...prev, [mid]: { ...prev[mid], [field]: current, [countField]: count } }));
    });
  }

  const commentHandlers: StreamHandlers = {
    onLike: (mid) => toggleCommentReaction(mid, "viewerLiked", "likeCount",
      (uuid) => apiToggleLike(uuid).then(r => ({ like_count: r.like_count, state: r.state }))),
    onDislike: (mid) => toggleCommentReaction(mid, "viewerDisliked", "dislikeCount",
      (uuid) => apiToggleDislike(uuid).then(r => ({ dislike_count: r.dislike_count, state: r.state }))),
    onRepeat: () => {},
    onComment: (parentMid, body) => addLocalComment(parentMid, body),
    onLoadComments: async () => {},
    async onDelete(mid) {
      const node = findInTree(rawCommentTree(), mid);
      if (!node?.uuid) return;
      await apiDeleteItem(node.uuid);
      setLocalComments(prev => prev.filter(c => c.mid !== mid));
    },
    async onEdit(mid, body, title) {
      const node = findInTree(rawCommentTree(), mid);
      if (!node?.uuid) return;
      await apiEditItem(node.uuid, body, title ?? "");
      let renderedBody = "";
      try {
        const converted = bbcodeToHtml(body, { oembedResolver });
        renderedBody = sanitizeHtml(typeof converted === "string" ? converted : "");
      } catch {
        renderedBody = "";
      }
      setLocalComments(prev => prev.map(c =>
        c.mid === mid ? { ...c, body: renderedBody, rawBody: body, title: title ?? "" } : c
      ));
    },
  };

  // TOC
  let bodyRef: HTMLDivElement | undefined;
  createEffect(() => {
    if (rendered() && bodyRef) hydrateLatex(bodyRef);
  });
  const { toc, activeId } = useToc(rendered, () => bodyRef);

  const isOwner = () => role() === "owner";

  return (
    <div class="relative max-w-5xl mx-auto py-4">
      <Show when={!data.loading && data()} fallback={<ArticleViewSkeleton />}>
        {(d) => (
          <div class="xl:flex xl:gap-8">
            {/* ── Article ── */}
            <article class="min-w-0 flex-1 max-w-none xl:max-w-3xl space-y-6">
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
                      year: "numeric", month: "long", day: "numeric",
                    })}
                    {" "}{t("articles.by")}{" "}
                    <a href={d().article.authorUrl} class="hover:underline text-txt">
                      {d().article.authorName}
                    </a>
                  </p>
                </header>

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

                  <Show when={auth()}>
                    <button
                      onClick={() => setShareOpen(v => !v)}
                      title={t("articles.share")}
                      class={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             transition-colors hover:bg-overlay
                             ${shareOpen() ? "text-accent" : "text-muted hover:text-txt"}`}
                    >
                      <MdOutlineShare size={17} />
                    </button>
                  </Show>

                  <Show when={auth()?.isLocal}>
                    <button
                      onClick={() => setReplyOpen(v => !v)}
                      class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             transition-colors hover:bg-overlay
                             ${replyOpen() ? "text-accent" : "text-muted hover:text-txt"}`}
                    >
                      <MdFillChat size={17} />
                      <span>{t("articles.comment")}</span>
                    </button>
                  </Show>

                  {/* Owner actions */}
                  <Show when={isOwner()}>
                    <button
                      type="button"
                      onClick={() => { setConfirmDelete(false); setEditing(true); }}
                      title="Edit article"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             transition-colors hover:bg-overlay text-muted hover:text-txt"
                    >
                      <BiRegularEdit size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setConfirmDelete(true); }}
                      title="Delete article"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                             transition-colors hover:bg-overlay text-muted hover:text-red-500"
                    >
                      <BiRegularTrash size={17} />
                    </button>
                  </Show>
                </div>

                {/* Share composer */}
                <Show when={shareOpen()}>
                  <PostComposer
                    open={true}
                    onClose={() => setShareOpen(false)}
                    profileUid={auth()?.uid ?? 0}
                    initialBody={(() => {
                      const title   = d().article.title ?? "";
                      const summary = d().article.summary ?? "";
                      let body = `[b]${title}[/b]`;
                      if (summary) body += `\n\n${summary}`;
                      return body;
                    })()}
                  />
                </Show>

                {/* Comment composer */}
                <Show when={replyOpen() && d().article.iid && d().article.profileUid}>
                  <CommentComposer
                    parentUuid={d().article.uuid}
                    profileUid={d().article.profileUid!}
                    onSubmitted={(body) => {
                      addLocalComment(d().article.mid, body);
                      setReplyOpen(false);
                    }}
                  />
                </Show>

                {/* Comments */}
                <section class="space-y-4">
                  <h2 class="text-base font-semibold text-txt">
                    {t("articles.comments")} ({countAllComments(commentTree())})
                  </h2>
                  <Show
                    when={commentTree().length > 0}
                    fallback={<p class="text-sm text-muted">{t("articles.no_comments")}</p>}
                  >
                    <CommentThread
                      comments={commentTree()}
                      show={true}
                      handlers={commentHandlers}
                      postAuthorAddress={d().article.authorAddress}
                    />
                  </Show>
                </section>
              </Show>
            </article>

            {/* ── TOC — fixed sidebar on xl+, floating collapsed launcher below xl ── */}
            <ArticleToc entries={toc()} activeId={activeId()} label={t("articles.on_this_page")} />
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
