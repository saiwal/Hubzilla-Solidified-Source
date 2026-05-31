// src/shared/stream/components/PostCard.tsx
import { createSignal, createEffect, onMount, onCleanup, Show, For } from "solid-js";
import { Portal } from "solid-js/web";
import { useThreadMode } from "@/shared/store/thread-mode";
import AuthorPopover from "./AuthorPopover";
import type { ThreadNode } from "@/shared/lib/thread";
import { countAllComments } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import CommentThread from "@/shared/views/CommentThread";
import formatPostDate from "@/shared/lib/date";
import { markItemSeen } from "@/shared/lib/markSeen";
import {
  MdFillBar_chart,
  MdFillChat,
  MdFillKeyboard_arrow_down,
  MdFillKeyboard_arrow_up,
  MdFillShare,
  MdFillFormat_list_bulleted,
  MdFillAccount_tree,
  MdFillThumb_down,
  MdFillThumb_up,
  MdOutlineShare,
  MdOutlineThumb_down,
  MdOutlineThumb_up,
  MdFillStar,
  MdFillStar_border,
  MdOutlineDelete,
  MdOutlineRefresh,
  MdFillNotifications,
  MdOutlineNotifications_none,
  MdOutlineCode,
} from "solid-icons/md";
import { useI18n } from "@/i18n";
import { BiRegularLinkExternal, BiSolidShareAlt } from "solid-icons/bi";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import ReshareComposer from "@/shared/editor/composers/ReshareComposer";
import DOMPurify from "dompurify";
import { useAuth } from "@/shared/store/auth-store";
import { apiFollowPost, apiUnfollowPost } from "@/shared/lib/item-api";
import EventCard from "./EventCard";
import { parseEventData } from "@/shared/lib/activity.mapper";
import AttachmentList from "./AttachmentList";

export type { StreamHandlers as PostActions };

/** Recursively flatten a thread tree into a chronological list.
 *  Each node's children are zeroed out so CommentThread won't re-nest them. */
function flattenThread(nodes: ThreadNode[]): ThreadNode[] {
  const result: ThreadNode[] = [];
  for (const node of nodes) {
    result.push({ ...node, children: [] });
    result.push(...flattenThread(node.children));
  }
  return result;
}
function hasNestedComments(nodes: ThreadNode[]): boolean {
  return nodes.some(n => n.children.length > 0);
}

function subtreeContainsUuid(nodes: ThreadNode[], uuid: string): boolean {
  for (const node of nodes) {
    if (node.uuid === uuid) return true;
    if (subtreeContainsUuid(node.children, uuid)) return true;
  }
  return false;
}

// Persists across remounts caused by setNodeChildren updating the post reference.
const openedByMid = new Set<string>();

export default function PostCard(props: {
  post: ThreadNode;
  handlers: StreamHandlers;
  onSeen?: (uuid: string) => void;
  compact?: boolean;
  highlighted?: boolean;
  highlightUuid?: string;
  postAuthorAddress?: string;
}) {
  const threadMode = useThreadMode();
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [reshareOpen, setReshareOpen] = createSignal(false);
  const [showComments, setShowComments] = createSignal(
    openedByMid.has(props.post.mid) ||
    (!props.compact && !!props.highlightUuid) ||
    (!!props.compact && !!props.highlightUuid && subtreeContainsUuid(props.post.children, props.highlightUuid))
  );
  const [threaded, setThreaded] = createSignal(threadMode());
  const [commentsLoaded, setCommentsLoaded] = createSignal(props.post.children.length > 0);
  const [commentsLoading, setCommentsLoading] = createSignal(false);
  const [deleteConfirming, setDeleteConfirming] = createSignal(false);
  const [refreshing, setRefreshing] = createSignal(false);
  const [following, setFollowing] = createSignal(props.post.viewerFollowing ?? false);
  const [followPending, setFollowPending] = createSignal(false);
  const [repeatDropdownOpen, setRepeatDropdownOpen] = createSignal(false);
  const [dropdownAnchor, setDropdownAnchor] = createSignal<{ top: number; left: number } | null>(null);
  const [showStats, setShowStats] = createSignal(false);
  const [statsLoading, setStatsLoading] = createSignal(false);
  const [statsData, setStatsData] = createSignal<{
    likes: StatActor[];
    dislikes: StatActor[];
    repeats: StatActor[];
  } | null>(null);
  const [showSource, setShowSource] = createSignal(false);
  const [sourceLoading, setSourceLoading] = createSignal(false);
  const [sourceData, setSourceData] = createSignal<unknown>(null);
  let repeatDropdownRef!: HTMLDivElement;
  let repeatDropdownPortalRef!: HTMLDivElement;
  let deleteTimer: ReturnType<typeof setTimeout> | null = null;
  const { locale } = useI18n();
  const auth = useAuth();
  let cardRef!: HTMLDivElement;

  // Detect event posts: prefer pre-parsed eventData from mapper, fall back to
  // parsing the body directly (handles cases where obj_type wasn't "Event").
  const isUnseen = () => props.post.flags.includes("unseen");
  const isRepeat = () => props.post.verb === "Announce";

  const eventData = () =>
    props.post.eventData ??
    (props.post.body.includes("[event-summary]") ? parseEventData(props.post.body) : undefined);

  const totalComments = () =>
    props.post.children.length > 0
      ? countAllComments(props.post.children)
      : (props.post.commentCount ?? 0);

  // Star: only meaningful for local authenticated users
  const canStar = () =>
    !!props.handlers.onStar && auth()?.isLocal === true;

  // Follow: available to local users when the post has a local iid
  const canFollow = () => auth()?.isLocal === true && !!props.post.iid;

  // Reshare: only local users can reshare posts that have a local iid
  const canReshare = () => auth()?.isLocal === true && !!props.post.iid;

  const canViewSource = () => auth()?.isLocal === true && !!props.post.iid;

  // Delete: viewer must be a local user and the post's author address must
  // match their own channel address (nick@hostname)
  const canDelete = () => {
    const a = auth();
    if (!props.handlers.onDelete || !a?.isLocal || !a.nick) return false;
    const viewerAddr = `${a.nick}@${window.location.hostname}`;
    return !!props.post.authorAddress && props.post.authorAddress === viewerAddr;
  };

  function persistShow(v: boolean) {
    if (v) openedByMid.add(props.post.mid);
    else openedByMid.delete(props.post.mid);
    setShowComments(v);
  }

  async function toggleComments() {
    if (!showComments() && !commentsLoaded() && totalComments() > 0) {
      persistShow(true);
      setCommentsLoading(true);
      try {
        await props.handlers.onLoadComments(props.post.mid, props.post.uuid);
        setCommentsLoaded(true);
      } finally {
        setCommentsLoading(false);
      }
    } else {
      persistShow(!showComments());
    }
  }

  onMount(() => {
    if (props.highlighted && props.compact) {
      requestAnimationFrame(() => {
        cardRef?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    const uuid = props.post.uuid;
    if (!uuid) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          markItemSeen(uuid);
          props.onSeen?.(uuid);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef);
    onCleanup(() => observer.disconnect());
  });

  onCleanup(() => {
    if (deleteTimer) clearTimeout(deleteTimer);
  });

  createEffect(() => {
    if (!repeatDropdownOpen()) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!repeatDropdownRef?.contains(t) && !repeatDropdownPortalRef?.contains(t))
        setRepeatDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  function openRepeatDropdown(e: MouseEvent) {
    e.stopPropagation();
    if (!repeatDropdownOpen()) {
      const rect = repeatDropdownRef.getBoundingClientRect();
      setDropdownAnchor({ top: rect.bottom + 4, left: rect.left });
    }
    setRepeatDropdownOpen(v => !v);
  }

  function onLike() { props.handlers.onLike(props.post.mid); }
  function onDislike() { props.handlers.onDislike(props.post.mid); }
  function onRepeat() { props.handlers.onRepeat(props.post.mid); }
  function onStar() { props.handlers.onStar?.(props.post.mid); }

  async function onRefresh() {
    if (refreshing() || !props.handlers.onRefresh) return;
    setRefreshing(true);
    try {
      await props.handlers.onRefresh(props.post.mid, props.post.uuid);
    } finally {
      setRefreshing(false);
    }
  }

  async function onFollowToggle() {
    if (!props.post.iid || followPending()) return;
    const next = !following();
    setFollowing(next);
    setFollowPending(true);
    try {
      await (next ? apiFollowPost(props.post.iid) : apiUnfollowPost(props.post.iid));
    } catch {
      setFollowing(!next);
    } finally {
      setFollowPending(false);
    }
  }

  async function toggleStats() {
    if (showStats()) { setShowStats(false); return; }
    setShowStats(true);
    if (statsData()) return;
    setStatsLoading(true);
    try {
      const mid = encodeURIComponent(props.post.mid);
      const parent = props.post.iid;
      const base = `/request?mid=${mid}${parent != null ? `&parent=${parent}` : ""}`;
      const [likesRes, dislikesRes, repeatsRes] = await Promise.all([
        fetch(`${base}&verb=like`, { credentials: "include" }),
        fetch(`${base}&verb=dislike`, { credentials: "include" }),
        fetch(`${base}&verb=announce`, { credentials: "include" }),
      ]);
      const parse = async (res: Response): Promise<StatActor[]> => {
        if (!res.ok) return [];
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data?.result ?? []);
        return arr.map((a: any) => ({
          name: a.name ?? "Unknown",
          avatar: a.photo ?? undefined,
          url: a.url ?? undefined,
        }));
      };
      const [likes, dislikes, repeats] = await Promise.all([
        parse(likesRes), parse(dislikesRes), parse(repeatsRes),
      ]);
      setStatsData({ likes, dislikes, repeats });
    } finally {
      setStatsLoading(false);
    }
  }

  async function toggleSource() {
    if (showSource()) { setShowSource(false); return; }
    setShowSource(true);
    if (sourceData()) return;
    setSourceLoading(true);
    try {
      const res = await fetch(`/api/item-source/${props.post.iid}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setSourceData(await res.json());
    } catch (e) {
      setSourceData({ error: String(e) });
    } finally {
      setSourceLoading(false);
    }
  }

  function onDeleteClick() {
    if (!deleteConfirming()) {
      setDeleteConfirming(true);
      deleteTimer = setTimeout(() => setDeleteConfirming(false), 3000);
    } else {
      if (deleteTimer) clearTimeout(deleteTimer);
      setDeleteConfirming(false);
      props.handlers.onDelete?.(props.post.mid);
    }
  }

  const visibleComments = () =>
    threaded() ? props.post.children : flattenThread(props.post.children);

  // ── Compact (comment) layout ──────────────────────────────────────────────
  if (props.compact) {
    return (
      <div
        ref={cardRef}
        class={`rounded-tl-lg rounded-bl-lg pl-3 py-2.5 mb-1 border transition-colors duration-500
               ${props.highlighted ? "border-accent bg-accent/5 ring-1 ring-accent/30" : "border-rim"}`}
      >
        {/* Single-line author header */}
        <div class="flex items-center gap-2 min-w-0">
          <Show when={isUnseen()}>
            <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          </Show>
          <AuthorPopover
            name={props.post.authorName}
            avatar={props.post.authorAvatar}
            url={props.post.authorUrl}
            address={props.post.authorAddress}
          >
            <Show
              when={props.post.authorAvatar}
              fallback={
                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-txt
                            shrink-0 flex items-center justify-center text-accent-fg text-[10px] font-bold cursor-pointer">
                  {props.post.authorName?.[0]?.toUpperCase() ?? "?"}
                </div>
              }
            >
              <img
                src={props.post.authorAvatar}
                width="24"
                height="24"
                class="rounded-full object-cover shrink-0 cursor-pointer"
              />
            </Show>
          </AuthorPopover>
          <Show when={props.postAuthorAddress && props.post.authorAddress === props.postAuthorAddress}>
            <span class="shrink-0 px-1 py-px rounded text-[10px] font-bold leading-none bg-accent text-accent-fg" title="Original poster">OP</span>
          </Show>
          <a href={props.post.authorUrl} class="font-medium text-sm text-txt hover:underline truncate">
            {props.post.authorName}
          </a>
          <Show when={props.post.via}>
            <div class="flex items-center gap-1 shrink-0">
              <MdFillShare size={11} class="text-muted" />
              <span class="text-xs text-muted">via</span>
              <a href={props.post.via!.url} class="text-xs text-muted hover:underline font-medium">
                {props.post.via!.name}
              </a>
            </div>
          </Show>
          <Show when={props.post.verb && props.post.verb !== "Create" && !isRepeat()}>
            <span class="text-xs text-muted italic shrink-0">
              {props.post.verb?.toLowerCase()}
            </span>
          </Show>
          <span
            class="text-xs text-muted shrink-0 ml-1"
            title={new Date(props.post.created + "Z").toLocaleString(locale())}
          >
            {formatPostDate(props.post.created, locale())}
          </span>
          <a
            href={props.post.permalink}
            class="ml-auto pr-2 text-subtle hover:text-txt transition-colors shrink-0"
            title="source"
          >
            <BiRegularLinkExternal size={13} />
          </a>
        </div>

        {/* Event card (compact) */}
        <Show when={eventData()}>
          {(ev) => <EventCard post={props.post} event={ev()} />}
        </Show>

        {/* Body — no title rendered for comments */}
        <Show when={!eventData()}>
          <div
            class="mt-1.5 prose prose-sm dark:prose-invert max-w-none text-muted
                   prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                   prose-blockquote:not-italic prose-blockquote:border-accent
                   prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:text-txt
                   prose-img:rounded-lg prose-img:my-1 break-words
                   prose-p:my-1 prose-p:leading-snug"
            innerHTML={props.post.body}
          />
        </Show>

        <Show when={(props.post.attachments?.length ?? 0) > 0}>
          <AttachmentList attachments={props.post.attachments!} compact />
        </Show>

        {/* Compact action bar */}
        <div class="mt-2 flex items-center gap-0.5 flex-wrap">
          <CompactActionBtn
            icon={props.post.viewerLiked ? <MdFillThumb_up size={14} /> : <MdOutlineThumb_up size={14} />}
            count={props.post.likeCount}
            label="Like"
            onClick={onLike}
            active={props.post.viewerLiked}
          />
          <CompactActionBtn
            icon={props.post.viewerDisliked ? <MdFillThumb_down size={14} /> : <MdOutlineThumb_down size={14} />}
            count={props.post.dislikeCount}
            label="Dislike"
            onClick={onDislike}
            active={props.post.viewerDisliked}
          />
          <Show
            when={canReshare()}
            fallback={
              <CompactActionBtn
                icon={props.post.viewerRepeated ? <MdFillShare size={14} /> : <MdOutlineShare size={14} />}
                count={props.post.repeatCount}
                label="Repeat"
                onClick={onRepeat}
                active={props.post.viewerRepeated}
              />
            }
          >
            <div ref={repeatDropdownRef} class="relative flex items-center">
              <button
                onClick={onRepeat}
                title="Repeat"
                class={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-l-md text-xs
                       transition-colors select-none hover:bg-overlay
                       ${props.post.viewerRepeated ? "text-accent" : "text-subtle"}`}
              >
                {props.post.viewerRepeated ? <MdFillShare size={14} /> : <MdOutlineShare size={14} />}
                <span>{props.post.repeatCount}</span>
              </button>
              <button
                onClick={openRepeatDropdown}
                title="More sharing options"
                class={`flex items-center px-0.5 py-1 rounded-r-md text-xs border-l border-rim/50
                       transition-colors select-none hover:bg-overlay
                       ${repeatDropdownOpen() ? "text-accent" : "text-subtle hover:text-txt"}`}
              >
                <MdFillKeyboard_arrow_down size={12} />
              </button>
            </div>
          </Show>

          <Show when={canStar()}>
            <button
              onClick={onStar}
              title={props.post.viewerStarred ? "Unstar" : "Star"}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none hover:bg-overlay
                     ${props.post.viewerStarred ? "text-yellow-500" : "text-subtle hover:text-txt"}`}
            >
              <Show when={props.post.viewerStarred} fallback={<MdFillStar_border size={14} />}>
                <MdFillStar size={14} />
              </Show>
            </button>
          </Show>

          <Show when={canFollow()}>
            <button
              onClick={onFollowToggle}
              disabled={followPending()}
              title={following() ? "Unfollow post" : "Follow post for notifications"}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none hover:bg-overlay disabled:opacity-50
                     ${following() ? "text-accent" : "text-subtle hover:text-txt"}`}
            >
              <Show when={following()} fallback={<MdOutlineNotifications_none size={14} />}>
                <MdFillNotifications size={14} />
              </Show>
            </button>
          </Show>

          <Show
            when={
              props.post.likeCount > 0 ||
              props.post.dislikeCount > 0 ||
              props.post.repeatCount > 0
            }
          >
            <button
              onClick={toggleStats}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors hover:bg-overlay
                     ${showStats() ? "text-accent" : "text-subtle hover:text-txt"}`}
              title="Post Statistics"
            >
              <MdFillBar_chart size={14} />
            </button>
          </Show>

          <Show when={canViewSource()}>
            <button
              onClick={toggleSource}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors hover:bg-overlay
                     ${showSource() ? "text-accent" : "text-subtle hover:text-txt"}`}
              title="View source"
            >
              <MdOutlineCode size={14} />
            </button>
          </Show>

          <Show when={totalComments() > 0}>
            <button
              onClick={toggleComments}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     text-subtle hover:bg-overlay hover:text-txt transition-colors"
            >
              <Show
                when={showComments()}
                fallback={<MdFillKeyboard_arrow_down size={14} />}
              >
                <MdFillKeyboard_arrow_up size={14} />
              </Show>
              <span>{totalComments()}</span>
            </button>
          </Show>

          {/* Thread/flat toggle — compact */}
          <Show when={hasNestedComments(props.post.children)}>
            <button
              onClick={() => setThreaded((v) => !v)}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     text-subtle hover:bg-overlay hover:text-txt transition-colors"
              title={threaded() ? "Switch to flat view" : "Switch to threaded view"}
            >
              <Show when={threaded()} fallback={<MdFillAccount_tree size={14} />}>
                <MdFillFormat_list_bulleted size={14} />
              </Show>
            </button>
          </Show>

          <button
            onClick={() => { setReplyOpen((v) => !v); if (!showComments()) toggleComments(); }}
            class="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-xs
                   text-subtle hover:bg-overlay hover:text-txt transition-colors"
          >
            <MdFillChat size={14} />
            <span>Reply</span>
          </button>

          <Show when={canDelete()}>
            <button
              onClick={onDeleteClick}
              title="Delete post"
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none
                     ${deleteConfirming()
                       ? "text-red-500 hover:bg-red-500/10"
                       : "text-subtle hover:bg-overlay hover:text-red-400"}`}
            >
              <MdOutlineDelete size={14} />
              <Show when={deleteConfirming()}>
                <span>Confirm?</span>
              </Show>
            </button>
          </Show>
        </div>

        <Show when={replyOpen() && props.post.iid && props.post.profileUid}>
          <CommentComposer
            parentMid={props.post.mid}
            parentIid={props.post.iid!}
            profileUid={props.post.profileUid!}
            onSubmitted={(body) => {
              props.handlers.onComment(
                props.post.mid, body,
                props.post.authorName, props.post.authorAvatar,
              );
              setReplyOpen(false);
              setShowComments(true);
            }}
          />
        </Show>
        <Show when={reshareOpen() && props.post.uuid}>
          <ReshareComposer
            postUuid={props.post.uuid}
            onSubmitted={() => setReshareOpen(false)}
            onCancel={() => setReshareOpen(false)}
          />
        </Show>
        <Show when={showStats()}>
          <PostStats loading={statsLoading()} data={statsData()} />
        </Show>
        <Show when={showSource()}>
          <PostSource loading={sourceLoading()} data={sourceData()} />
        </Show>
        <Show when={commentsLoading()}>
          <div class="mt-2 ml-2 text-xs text-muted animate-pulse">Loading comments…</div>
        </Show>
        <CommentThread
          comments={visibleComments()}
          show={showComments() && !commentsLoading()}
          handlers={props.handlers}
          highlightUuid={props.highlightUuid}
          postAuthorAddress={props.postAuthorAddress ?? props.post.authorAddress}
        />
      </div>
    );
  }

  // ── Full (main post) layout ───────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      class="relative bg-surface border border-rim rounded-2xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Header */}
      <div class="flex items-start gap-3">
        <AuthorPopover
          name={props.post.authorName}
          avatar={props.post.authorAvatar}
          url={props.post.authorUrl}
          address={props.post.authorAddress}
        >
          <Show
            when={props.post.authorAvatar}
            fallback={
              <div class="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent-txt
                          shrink-0 flex items-center justify-center text-accent-fg text-sm font-bold ring-1 ring-rim
                          cursor-pointer">
                {props.post.authorName?.[0]?.toUpperCase() ?? "?"}
              </div>
            }
          >
            <img
              src={props.post.authorAvatar}
              width="44"
              height="44"
              class="rounded-full object-cover ring-1 ring-rim cursor-pointer"
            />
          </Show>
        </AuthorPopover>
        <div class="flex flex-col">
          <div class="flex items-center gap-1.5 flex-wrap">
            <a href={props.post.authorUrl} class="font-semibold text-txt hover:underline">
              {props.post.authorName}
            </a>
            <Show when={props.post.via}>
              <div class="flex items-center gap-1">
                <MdFillShare size={12} class="text-muted shrink-0" />
                <span class="text-xs text-muted">via</span>
                <a href={props.post.via!.url} class="text-xs text-muted hover:underline font-medium">
                  {props.post.via!.name}
                </a>
              </div>
            </Show>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              class="text-sm text-muted"
              title={new Date(props.post.created + "Z").toLocaleString(locale())}
            >
              {formatPostDate(props.post.created, locale())}
            </span>
            <Show when={props.post.verb && props.post.verb !== "Create" && !isRepeat()}>
              <span class="text-xs text-muted italic">
                {props.post.verb?.toLowerCase()}
              </span>
            </Show>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-2 shrink-0">
          <Show when={isUnseen()}>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-fg leading-none">
              New
            </span>
          </Show>
          <a
            href={props.post.permalink}
            class="text-sm text-muted hover:text-txt transition-colors"
            title="source"
          >
            <BiRegularLinkExternal size={17} />
          </a>
        </div>
      </div>

      {/* Title */}
      <Show when={props.post.title}>
        <div
          class="mt-6 prose prose-sm dark:prose-invert max-w-none
                 [&>*]:font-bold [&>*]:tracking-tight [&>*]:text-lg [&>*]:text-txt"
          innerHTML={DOMPurify.sanitize(props.post.title!)}
        />
      </Show>

      {/* Event card */}
      <Show when={eventData()}>
        {(ev) => <EventCard post={props.post} event={ev()} />}
      </Show>

      {/* Body — hidden for pure event posts (body is just BBCode tags) */}
      <Show when={!eventData()}>
        <div
          class="mt-4 prose-code:break-all prose prose-sm dark:prose-invert max-w-none
                 prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                 prose-blockquote:not-italic prose-blockquote:border-accent
                 prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-sm prose-code:text-txt
                 prose-img:rounded-lg prose-img:my-2 break-words text-muted"
          innerHTML={props.post.body}
        />
      </Show>

      <Show when={(props.post.attachments?.length ?? 0) > 0}>
        <AttachmentList attachments={props.post.attachments!} />
      </Show>

      {/* Action bar */}
      <div class="mt-4 pt-3 border-t border-rim flex items-center gap-1 flex-wrap">
        <ActionBtn
          icon={props.post.viewerLiked ? <MdFillThumb_up size={17} /> : <MdOutlineThumb_up size={17} />}
          count={props.post.likeCount}
          label="Like"
          onClick={onLike}
          active={props.post.viewerLiked}
          activeClass="text-accent"
        />
        <ActionBtn
          icon={props.post.viewerDisliked ? <MdFillThumb_down size={17} /> : <MdOutlineThumb_down size={17} />}
          count={props.post.dislikeCount}
          label="Dislike"
          onClick={onDislike}
          active={props.post.viewerDisliked}
          activeClass="text-accent"
        />
        <Show
          when={canReshare()}
          fallback={
            <ActionBtn
              icon={props.post.viewerRepeated ? <MdFillShare size={17} /> : <MdOutlineShare size={17} />}
              count={props.post.repeatCount}
              label="Repeat"
              onClick={onRepeat}
              active={props.post.viewerRepeated}
              activeClass="text-accent"
            />
          }
        >
          <div ref={repeatDropdownRef} class="relative flex items-center">
            <button
              onClick={onRepeat}
              title="Repeat"
              class={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-l-lg text-sm font-medium
                     transition-colors select-none hover:bg-overlay
                     ${props.post.viewerRepeated ? "text-accent" : "text-muted"}`}
            >
              {props.post.viewerRepeated ? <MdFillShare size={17} /> : <MdOutlineShare size={17} />}
              <span>{props.post.repeatCount}</span>
            </button>
            <button
              onClick={openRepeatDropdown}
              title="More sharing options"
              class={`flex items-center px-1.5 py-1.5 rounded-r-lg text-sm font-medium border-l border-rim/50
                     transition-colors select-none hover:bg-overlay
                     ${repeatDropdownOpen() ? "text-accent" : "text-muted hover:text-txt"}`}
            >
              <MdFillKeyboard_arrow_down size={14} />
            </button>
          </div>
        </Show>

        <Show when={canStar()}>
          <button
            onClick={onStar}
            title={props.post.viewerStarred ? "Unstar" : "Star"}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none hover:bg-overlay
                   ${props.post.viewerStarred ? "text-yellow-500" : "text-muted hover:text-txt"}`}
          >
            <Show when={props.post.viewerStarred} fallback={<MdFillStar_border size={17} />}>
              <MdFillStar size={17} />
            </Show>
          </button>
        </Show>

        <Show when={canFollow()}>
          <button
            onClick={onFollowToggle}
            disabled={followPending()}
            title={following() ? "Unfollow post" : "Follow post for notifications"}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none hover:bg-overlay disabled:opacity-50
                   ${following() ? "text-accent" : "text-muted hover:text-txt"}`}
          >
            <Show when={following()} fallback={<MdOutlineNotifications_none size={17} />}>
              <MdFillNotifications size={17} />
            </Show>
          </button>
        </Show>

        <Show
          when={
            props.post.likeCount > 0 ||
            props.post.dislikeCount > 0 ||
            props.post.repeatCount > 0
          }
        >
          <button
            onClick={toggleStats}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors hover:bg-overlay
                   ${showStats() ? "text-accent" : "text-muted hover:text-txt"}`}
            title="Post Statistics"
          >
            <MdFillBar_chart size={17} />
          </button>
        </Show>

        <Show when={canViewSource()}>
          <button
            onClick={toggleSource}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors hover:bg-overlay
                   ${showSource() ? "text-accent" : "text-muted hover:text-txt"}`}
            title="View source"
          >
            <MdOutlineCode size={17} />
          </button>
        </Show>

        <Show when={totalComments() > 0}>
          <button
            onClick={toggleComments}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title="Toggle comments"
          >
            <Show
              when={showComments()}
              fallback={<MdFillKeyboard_arrow_down size={17} />}
            >
              <MdFillKeyboard_arrow_up size={17} />
            </Show>
            <span>
              {totalComments()} comment{totalComments() !== 1 ? "s" : ""}
            </span>
          </button>
        </Show>

        {/* Thread/flat toggle — full */}
        <Show when={hasNestedComments(props.post.children)}>
          <button
            onClick={() => setThreaded((v) => !v)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title={threaded() ? "Switch to flat view" : "Switch to threaded view"}
          >
            <Show when={threaded()} fallback={<MdFillAccount_tree size={17} />}>
              <MdFillFormat_list_bulleted size={17} />
            </Show>
            <span>{threaded() ? "Flat" : "Threaded"}</span>
          </button>
        </Show>

        <Show when={!!props.handlers.onRefresh}>
          <button
            onClick={onRefresh}
            disabled={refreshing()}
            title="Refresh"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors disabled:opacity-50"
          >
            <MdOutlineRefresh
              size={17}
              class={refreshing() ? "animate-spin" : ""}
            />
          </button>
        </Show>

        <button
          onClick={() => { setReplyOpen((v) => !v); if (!showComments()) toggleComments(); }}
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                 text-muted hover:bg-overlay hover:text-txt transition-colors"
          title="Reply"
        >
          <MdFillChat size={17} />
          <span>Reply</span>
        </button>

        <Show when={canDelete()}>
          <button
            onClick={onDeleteClick}
            title="Delete post"
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none
                   ${deleteConfirming()
                     ? "text-red-500 hover:bg-red-500/10"
                     : "text-muted hover:bg-overlay hover:text-red-400"}`}
          >
            <MdOutlineDelete size={17} />
            <Show when={deleteConfirming()}>
              <span>Confirm?</span>
            </Show>
          </button>
        </Show>
      </div>

      <Portal>
        <Show when={repeatDropdownOpen() && dropdownAnchor()}>
          <div
            ref={repeatDropdownPortalRef}
            class="fixed z-[9999] min-w-[11rem] bg-surface border border-rim rounded-lg shadow-lg py-1"
            style={{ top: `${dropdownAnchor()!.top}px`, left: `${dropdownAnchor()!.left}px` }}
          >
            <button
              onClick={() => { setRepeatDropdownOpen(false); setReshareOpen(true); }}
              class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors text-left"
            >
              <BiSolidShareAlt size={15} />
              <span>Reshare with comment</span>
            </button>
          </div>
        </Show>
      </Portal>

      <Show when={showStats()}>
        <PostStats loading={statsLoading()} data={statsData()} />
      </Show>
      <Show when={showSource()}>
        <PostSource loading={sourceLoading()} data={sourceData()} />
      </Show>

      <Show when={replyOpen() && props.post.iid && props.post.profileUid}>
        <CommentComposer
          parentMid={props.post.mid}
          parentIid={props.post.iid!}
          profileUid={props.post.profileUid!}
          onSubmitted={(body) => {
            props.handlers.onComment(
              props.post.mid, body,
              props.post.authorName, props.post.authorAvatar,
            );
            setReplyOpen(false);
            setShowComments(true);
          }}
        />
      </Show>
      <Show when={reshareOpen() && props.post.uuid}>
        <ReshareComposer
          postUuid={props.post.uuid}
          onSubmitted={() => setReshareOpen(false)}
          onCancel={() => setReshareOpen(false)}
        />
      </Show>
      <Show when={commentsLoading()}>
        <div class="mt-3 text-sm text-muted animate-pulse">Loading comments…</div>
      </Show>
      <CommentThread
        comments={visibleComments()}
        show={showComments() && !commentsLoading()}
        handlers={props.handlers}
        highlightUuid={props.highlightUuid}
        postAuthorAddress={props.post.authorAddress}
      />
    </div>
  );
}

interface StatActor {
  name: string;
  avatar?: string;
  url?: string;
}

function StatActorChip(props: { actor: StatActor }) {
  return (
    <a
      href={props.actor.url}
      target="_blank"
      rel="noopener noreferrer"
      class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-overlay hover:bg-rim transition-colors text-xs text-txt"
      title={props.actor.name}
    >
      <Show
        when={props.actor.avatar}
        fallback={
          <div class="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-accent-txt shrink-0 flex items-center justify-center text-accent-fg text-[9px] font-bold">
            {props.actor.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        }
      >
        <img src={props.actor.avatar} class="w-5 h-5 rounded-full object-cover shrink-0" />
      </Show>
      <span class="max-w-[8rem] truncate">{props.actor.name}</span>
    </a>
  );
}

function PostStats(props: {
  loading: boolean;
  data: { likes: StatActor[]; dislikes: StatActor[]; repeats: StatActor[] } | null;
}) {
  const tabs = () => {
    const d = props.data;
    if (!d) return [];
    return [
      { key: "likes" as const, label: "Likes", count: d.likes.length },
      { key: "dislikes" as const, label: "Dislikes", count: d.dislikes.length },
      { key: "repeats" as const, label: "Repeats", count: d.repeats.length },
    ].filter(t => t.count > 0);
  };

  const [tab, setTab] = createSignal<"likes" | "dislikes" | "repeats">("likes");

  createEffect(() => {
    const first = tabs()[0]?.key;
    if (first) setTab(first);
  });

  const actors = () => {
    const d = props.data;
    if (!d) return [];
    return d[tab()] ?? [];
  };

  return (
    <div class="mt-3 pt-3 border-t border-rim text-sm">
      <Show when={props.loading}>
        <div class="text-xs text-muted animate-pulse">Loading…</div>
      </Show>
      <Show when={!props.loading && props.data}>
        <Show
          when={tabs().length > 0}
          fallback={<div class="text-xs text-muted">No activity details available.</div>}
        >
          <div class="flex border-b border-rim mb-3">
            <For each={tabs()}>
              {(t) => (
                <button
                  onClick={() => setTab(t.key)}
                  class={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px
                    ${tab() === t.key
                      ? "border-accent text-txt"
                      : "border-transparent text-muted hover:text-txt hover:border-rim"}`}
                >
                  {t.label}
                  <span class={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                    ${tab() === t.key ? "bg-accent text-accent-fg" : "bg-overlay text-muted"}`}>
                    {t.count}
                  </span>
                </button>
              )}
            </For>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <For each={actors()}>{(a) => <StatActorChip actor={a} />}</For>
          </div>
        </Show>
      </Show>
    </div>
  );
}

interface ItemSourceResponse {
  id: number;
  mid: string;
  uuid: string;
  plink: string;
  llink: string;
  cached: boolean;
  source: unknown;
  error?: string;
}

function PostSource(props: { loading: boolean; data: unknown }) {
  const typed = () => props.data as ItemSourceResponse | null;
  return (
    <div class="mt-3 pt-3 border-t border-rim text-xs">
      <Show when={props.loading}>
        <div class="text-muted animate-pulse">Loading source…</div>
      </Show>
      <Show when={!props.loading && typed()?.error}>
        <div class="text-red-500">{typed()!.error}</div>
      </Show>
      <Show when={!props.loading && typed() && !typed()?.error}>
        <div class="flex flex-wrap gap-x-4 gap-y-0.5 mb-2 text-muted font-mono">
          <span>id: <span class="text-txt">{typed()!.id}</span></span>
          <span>uuid: <span class="text-txt">{typed()!.uuid}</span></span>
          <span>{typed()!.cached ? "cached" : "generated"}</span>
          <a href={typed()!.plink} target="_blank" rel="noopener noreferrer"
             class="text-accent hover:underline">plink</a>
          <a href={typed()!.llink} target="_blank" rel="noopener noreferrer"
             class="text-accent hover:underline">llink</a>
        </div>
        <pre class="bg-overlay rounded-lg p-3 overflow-x-auto max-h-96 text-txt font-mono whitespace-pre-wrap break-all leading-relaxed">
          {JSON.stringify(typed()!.source, null, 2)}
        </pre>
      </Show>
    </div>
  );
}

function ActionBtn(props: {
  icon: any;
  count: number;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClass: string;
}) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors select-none hover:bg-overlay
              ${props.active ? props.activeClass : "text-muted"}`}
    >
      {props.icon}
      <span>{props.count}</span>
    </button>
  );
}

function CompactActionBtn(props: {
  icon: any;
  count: number;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
              transition-colors select-none hover:bg-overlay
              ${props.active ? "text-accent" : "text-subtle"}`}
    >
      {props.icon}
      <span>{props.count}</span>
    </button>
  );
}
