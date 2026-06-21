// src/shared/stream/components/PostCard.tsx
import { createSignal, createEffect, onMount, onCleanup, lazy, Show, For } from "solid-js";
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
  MdOutlineReply,
  MdFillFolder,
  MdFillFolder_open,
  MdFillAdd,
} from "solid-icons/md";
import { useI18n } from "@/i18n";
import { BiRegularLinkExternal, BiSolidShareAlt } from "solid-icons/bi";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import ReshareComposer from "@/shared/editor/composers/ReshareComposer";
import DOMPurify from "dompurify";
import { useAuth } from "@/shared/store/auth-store";
import { apiFollowPost, apiUnfollowPost, apiFetchItemFolders, apiSaveToFolder } from "@/shared/lib/item-api";
import { fetchFolders } from "@/modules/network/api";
import EventCard from "./EventCard";
import { parseEventData } from "@/shared/lib/activity.mapper";
import AttachmentList from "./AttachmentList";
import { apiFetch } from "@/shared/lib/fetch";
import { usePlyr } from "@/shared/lib/usePlyr";
const PostDetailModal = lazy(() => import("@/shared/views/PostDetailModal"));

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
  initiallyExpanded?: boolean;
  seamless?: boolean;
}) {
  const threadMode = useThreadMode();
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [reshareOpen, setReshareOpen] = createSignal(false);
  const [showComments, setShowComments] = createSignal(
    !!props.initiallyExpanded ||
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
  const [moreDropdownOpen, setMoreDropdownOpen] = createSignal(false);
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
  const [rssImporting, setRssImporting] = createSignal(false);
  const [rssImportedUuid, setRssImportedUuid] = createSignal<string | null>(null);
  const [showFolderPicker, setShowFolderPicker] = createSignal(false);
  const [itemFolders, setItemFolders] = createSignal<string[]>([]);
  const [allFolders, setAllFolders] = createSignal<string[]>([]);
  const [folderPickerLoading, setFolderPickerLoading] = createSignal(false);
  const [folderSaving, setFolderSaving] = createSignal<string | null>(null);
  const [newFolderInput, setNewFolderInput] = createSignal("");
  let repeatDropdownRef!: HTMLDivElement;
  let repeatDropdownPortalRef!: HTMLDivElement;
  let moreDropdownRef!: HTMLDivElement;
  let deleteTimer: ReturnType<typeof setTimeout> | null = null;
  const { locale, t } = useI18n();
  const auth = useAuth();
  let cardRef!: HTMLDivElement;
  const [bodyRef, setBodyRef] = createSignal<HTMLElement>();
  usePlyr(bodyRef, () => props.post.body);

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

  // Folder: local users only, post must be in their stream (iid present)
  const canFolder = () => auth()?.isLocal === true && !!props.post.iid;
  const hasFolders = () => itemFolders().length > 0;

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

  createEffect(() => {
    if (!moreDropdownOpen()) return;
    const handler = (e: MouseEvent) => {
      if (!moreDropdownRef?.contains(e.target as Node))
        setMoreDropdownOpen(false);
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

  const isRss = () => props.post.authorNetwork === "rss" && !!props.post.permalink;

  async function handleRssImport() {
    if (rssImporting()) return;
    setRssImporting(true);
    try {
      const res = await apiFetch(`/api/search/import?url=${encodeURIComponent(props.post.permalink)}`);
      const body = await res.json();
      if (res.ok && body?.data?.uuid) {
        setRssImportedUuid(body.data.uuid);
      }
    } finally {
      setRssImporting(false);
    }
  }

  async function toggleFolderPicker() {
    const next = !showFolderPicker();
    setShowFolderPicker(next);
    if (!next) return;
    setFolderPickerLoading(true);
    try {
      const [item, all] = await Promise.all([
        apiFetchItemFolders(props.post.uuid),
        fetchFolders(),
      ]);
      setItemFolders(item);
      setAllFolders(all);
    } finally {
      setFolderPickerLoading(false);
    }
  }

  async function toggleFolder(name: string) {
    if (folderSaving()) return;
    const isIn = itemFolders().includes(name);
    setFolderSaving(name);
    try {
      const updated = await apiSaveToFolder(props.post.uuid, name, isIn);
      setItemFolders(updated);
      // Add newly created folder to the all-folders list if not present
      if (!isIn && !allFolders().includes(name)) {
        setAllFolders(prev => [...prev, name].sort());
      }
    } finally {
      setFolderSaving(null);
    }
  }

  async function addNewFolder() {
    const name = newFolderInput().trim();
    if (!name) return;
    setNewFolderInput("");
    await toggleFolder(name);
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
          name: a.name ?? t("post.unknown"),
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
        class={`rounded-tl-lg rounded-bl-lg pl-2 md:pl-3 py-2 md:py-2.5 mb-1 border transition-colors duration-500
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
            network={props.post.authorNetwork}
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
            <span class="shrink-0 px-1 py-px rounded text-[10px] font-bold leading-none bg-accent text-accent-fg" title={t("post.op_title")}>{t("post.op")}</span>
          </Show>
          <a href={props.post.authorUrl} class="font-medium text-sm text-txt hover:underline truncate">
            {props.post.authorName}
          </a>
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
            ref={setBodyRef}
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
            label={t("post.like")}
            onClick={onLike}
            active={props.post.viewerLiked}
          />
          <CompactActionBtn
            icon={props.post.viewerDisliked ? <MdFillThumb_down size={14} /> : <MdOutlineThumb_down size={14} />}
            count={props.post.dislikeCount}
            label={t("post.dislike")}
            onClick={onDislike}
            active={props.post.viewerDisliked}
          />
          <Show
            when={canReshare()}
            fallback={
              <CompactActionBtn
                icon={props.post.viewerRepeated ? <MdFillShare size={14} /> : <MdOutlineShare size={14} />}
                count={props.post.repeatCount}
                label={t("post.repeat")}
                onClick={onRepeat}
                active={props.post.viewerRepeated}
              />
            }
          >
            <div ref={repeatDropdownRef} class="relative flex items-center">
              <button
                onClick={onRepeat}
                title={t("post.repeat")}
                class={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-l-md text-xs
                       transition-colors select-none hover:bg-overlay
                       ${props.post.viewerRepeated ? "text-accent" : "text-subtle"}`}
              >
                {props.post.viewerRepeated ? <MdFillShare size={14} /> : <MdOutlineShare size={14} />}
                <span>{props.post.repeatCount}</span>
              </button>
              <button
                onClick={openRepeatDropdown}
                title={t("post.more_sharing")}
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
              title={props.post.viewerStarred ? t("post.unstar") : t("post.star")}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none hover:bg-overlay
                     ${props.post.viewerStarred ? "text-yellow-500" : "text-subtle hover:text-txt"}`}
            >
              <Show when={props.post.viewerStarred} fallback={<MdFillStar_border size={14} />}>
                <MdFillStar size={14} />
              </Show>
            </button>
          </Show>

          <Show when={canFolder()}>
            <button
              onClick={toggleFolderPicker}
              title={t("post.save_to_folder")}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none hover:bg-overlay
                     ${showFolderPicker() || hasFolders() ? "text-accent" : "text-subtle hover:text-txt"}`}
            >
              <Show when={hasFolders()} fallback={<MdFillFolder_open size={14} />}>
                <MdFillFolder size={14} />
              </Show>
            </button>
          </Show>

          <Show when={canFollow()}>
            <button
              onClick={onFollowToggle}
              disabled={followPending()}
              title={following() ? t("post.unfollow_post") : t("post.follow_for_notifs")}
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
              title={t("post.post_statistics")}
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
              title={t("post.view_source")}
            >
              <MdOutlineCode size={14} />
            </button>
          </Show>

          <Show when={isRss()}>
            <button
              onClick={handleRssImport}
              disabled={rssImporting()}
              title={t("post.import_post")}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     text-subtle hover:bg-overlay hover:text-accent transition-colors
                     disabled:opacity-50"
            >
              <MdOutlineRefresh size={14} classList={{ "animate-spin": rssImporting() }} />
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
              title={threaded() ? t("post.toggle_flat") : t("post.toggle_threaded")}
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
            <MdOutlineReply size={14} />
            <span>{t("post.reply")}</span>
          </button>

          <Show when={canDelete()}>
            <button
              onClick={onDeleteClick}
              title={t("post.delete_post")}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none
                     ${deleteConfirming()
                       ? "text-red-500 hover:bg-red-500/10"
                       : "text-subtle hover:bg-overlay hover:text-red-400"}`}
            >
              <MdOutlineDelete size={14} />
              <Show when={deleteConfirming()}>
                <span>{t("post.confirm")}</span>
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
        <Show when={showFolderPicker()}>
          <FolderPicker
            loading={folderPickerLoading()}
            itemFolders={itemFolders()}
            allFolders={allFolders()}
            saving={folderSaving()}
            newInput={newFolderInput()}
            onSetInput={setNewFolderInput}
            onToggle={toggleFolder}
            onAdd={addNewFolder}
          />
        </Show>
        <Show when={commentsLoading()}>
          <div class="mt-2 ml-2 text-xs text-muted animate-pulse">{t("post.loading_comments")}</div>
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
      class={props.seamless
        ? "relative bg-surface p-3 md:p-5"
        : "relative bg-surface border border-rim rounded-2xl p-3 md:p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200"}
    >
      {/* Header */}
      <div class="flex items-start gap-3">
        <AuthorPopover
          name={props.post.authorName}
          avatar={props.post.authorAvatar}
          url={props.post.authorUrl}
          address={props.post.authorAddress}
          network={props.post.authorNetwork}
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
              {t("post.new_badge")}
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
          ref={setBodyRef}
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
        {/* ── Always visible: Like / Dislike / Repeat ── */}
        <ActionBtn
          icon={props.post.viewerLiked ? <MdFillThumb_up size={17} /> : <MdOutlineThumb_up size={17} />}
          count={props.post.likeCount}
          label={t("post.like")}
          onClick={onLike}
          active={props.post.viewerLiked}
          activeClass="text-accent"
        />
        <ActionBtn
          icon={props.post.viewerDisliked ? <MdFillThumb_down size={17} /> : <MdOutlineThumb_down size={17} />}
          count={props.post.dislikeCount}
          label={t("post.dislike")}
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
              label={t("post.repeat")}
              onClick={onRepeat}
              active={props.post.viewerRepeated}
              activeClass="text-accent"
            />
          }
        >
          <div ref={repeatDropdownRef} class="relative flex items-center">
            <button
              onClick={onRepeat}
              title={t("post.repeat")}
              class={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-l-lg text-sm font-medium
                     transition-colors select-none hover:bg-overlay
                     ${props.post.viewerRepeated ? "text-accent" : "text-muted"}`}
            >
              {props.post.viewerRepeated ? <MdFillShare size={17} /> : <MdOutlineShare size={17} />}
              <span>{props.post.repeatCount}</span>
            </button>
            <button
              onClick={openRepeatDropdown}
              title={t("post.more_sharing")}
              class={`flex items-center px-1.5 py-1.5 rounded-r-lg text-sm font-medium border-l border-rim/50
                     transition-colors select-none hover:bg-overlay
                     ${repeatDropdownOpen() ? "text-accent" : "text-muted hover:text-txt"}`}
            >
              <MdFillKeyboard_arrow_down size={14} />
            </button>
          </div>
        </Show>

        {/* ── Desktop-only inline actions ── */}
        <Show when={canStar()}>
          <button
            onClick={onStar}
            title={props.post.viewerStarred ? t("post.unstar") : t("post.star")}
            class={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none hover:bg-overlay
                   ${props.post.viewerStarred ? "text-yellow-500" : "text-muted hover:text-txt"}`}
          >
            <Show when={props.post.viewerStarred} fallback={<MdFillStar_border size={17} />}>
              <MdFillStar size={17} />
            </Show>
          </button>
        </Show>

        <Show when={canFolder()}>
          <button
            onClick={toggleFolderPicker}
            title={t("post.save_to_folder")}
            class={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none hover:bg-overlay
                   ${showFolderPicker() || hasFolders() ? "text-accent" : "text-muted hover:text-txt"}`}
          >
            <Show when={hasFolders()} fallback={<MdFillFolder_open size={17} />}>
              <MdFillFolder size={17} />
            </Show>
          </button>
        </Show>

        <Show when={canFollow()}>
          <button
            onClick={onFollowToggle}
            disabled={followPending()}
            title={following() ? t("post.unfollow_post") : t("post.follow_for_notifs")}
            class={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
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
            class={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors hover:bg-overlay
                   ${showStats() ? "text-accent" : "text-muted hover:text-txt"}`}
            title={t("post.post_statistics")}
          >
            <MdFillBar_chart size={17} />
          </button>
        </Show>

        <Show when={canViewSource()}>
          <button
            onClick={toggleSource}
            class={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors hover:bg-overlay
                   ${showSource() ? "text-accent" : "text-muted hover:text-txt"}`}
            title={t("post.view_source")}
          >
            <MdOutlineCode size={17} />
          </button>
        </Show>

        <Show when={isRss()}>
          <button
            onClick={handleRssImport}
            disabled={rssImporting()}
            title={t("post.import_post")}
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-accent transition-colors
                   disabled:opacity-50"
          >
            <MdOutlineRefresh size={17} classList={{ "animate-spin": rssImporting() }} />
            <span>{t("post.import")}</span>
          </button>
        </Show>

        {/* ── Comments toggle: icon always, count label on desktop ── */}
        <Show when={totalComments() > 0}>
          <button
            onClick={toggleComments}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title={t("post.toggle_comments")}
          >
            <Show
              when={showComments()}
              fallback={<MdFillKeyboard_arrow_down size={17} />}
            >
              <MdFillKeyboard_arrow_up size={17} />
            </Show>
            <MdFillChat size={15} class="md:hidden" />
            <span class="hidden md:inline">{totalComments()} {totalComments() !== 1 ? t("post.comments_plural") : t("post.comments_singular")}</span>
            <span class="md:hidden">{totalComments()}</span>
          </button>
        </Show>

        {/* ── Thread/flat toggle: desktop only ── */}
        <Show when={hasNestedComments(props.post.children)}>
          <button
            onClick={() => setThreaded((v) => !v)}
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title={threaded() ? t("post.toggle_flat") : t("post.toggle_threaded")}
          >
            <Show when={threaded()} fallback={<MdFillAccount_tree size={17} />}>
              <MdFillFormat_list_bulleted size={17} />
            </Show>
            <span>{threaded() ? t("post.flat") : t("post.threaded")}</span>
          </button>
        </Show>

        {/* ── Refresh: desktop only ── */}
        <Show when={!!props.handlers.onRefresh}>
          <button
            onClick={onRefresh}
            disabled={refreshing()}
            title={t("post.refresh")}
            class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors disabled:opacity-50"
          >
            <MdOutlineRefresh
              size={17}
              class={refreshing() ? "animate-spin" : ""}
            />
          </button>
        </Show>

        {/* ── Mobile-only: more actions dropdown ── */}
        <div ref={moreDropdownRef} class="relative md:hidden">
          <button
            onClick={() => setMoreDropdownOpen(v => !v)}
            title={t("post.more_actions")}
            class={`flex items-center px-2 py-1.5 rounded-lg text-sm font-medium
                   transition-colors hover:bg-overlay
                   ${moreDropdownOpen() ? "text-accent" : "text-muted"}`}
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          <Show when={moreDropdownOpen()}>
            <div class="absolute bottom-full left-0 mb-1 min-w-[10rem] bg-surface border border-rim rounded-lg shadow-lg py-1 z-50">
              <Show when={canStar()}>
                <button
                  onClick={() => { onStar(); setMoreDropdownOpen(false); }}
                  class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                         ${props.post.viewerStarred ? "text-yellow-500" : "text-txt"}`}
                >
                  <Show when={props.post.viewerStarred} fallback={<MdFillStar_border size={15} />}>
                    <MdFillStar size={15} />
                  </Show>
                  <span>{props.post.viewerStarred ? t("post.unstar") : t("post.star")}</span>
                </button>
              </Show>
              <Show when={canFollow()}>
                <button
                  onClick={() => { onFollowToggle(); setMoreDropdownOpen(false); }}
                  disabled={followPending()}
                  class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left disabled:opacity-50
                         ${following() ? "text-accent" : "text-txt"}`}
                >
                  <Show when={following()} fallback={<MdOutlineNotifications_none size={15} />}>
                    <MdFillNotifications size={15} />
                  </Show>
                  <span>{following() ? t("post.unfollow") : t("post.follow")}</span>
                </button>
              </Show>
              <Show when={props.post.likeCount > 0 || props.post.dislikeCount > 0 || props.post.repeatCount > 0}>
                <button
                  onClick={() => { toggleStats(); setMoreDropdownOpen(false); }}
                  class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                         ${showStats() ? "text-accent" : "text-txt"}`}
                >
                  <MdFillBar_chart size={15} />
                  <span>{t("post.statistics")}</span>
                </button>
              </Show>
              <Show when={canViewSource()}>
                <button
                  onClick={() => { toggleSource(); setMoreDropdownOpen(false); }}
                  class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                         ${showSource() ? "text-accent" : "text-txt"}`}
                >
                  <MdOutlineCode size={15} />
                  <span>{t("post.view_source")}</span>
                </button>
              </Show>
              <Show when={isRss()}>
                <button
                  onClick={() => { handleRssImport(); setMoreDropdownOpen(false); }}
                  disabled={rssImporting()}
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors text-left disabled:opacity-50"
                >
                  <MdOutlineRefresh size={15} classList={{ "animate-spin": rssImporting() }} />
                  <span>{t("post.import")}</span>
                </button>
              </Show>
              <Show when={hasNestedComments(props.post.children)}>
                <button
                  onClick={() => { setThreaded(v => !v); setMoreDropdownOpen(false); }}
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors text-left"
                >
                  <Show when={threaded()} fallback={<MdFillAccount_tree size={15} />}>
                    <MdFillFormat_list_bulleted size={15} />
                  </Show>
                  <span>{threaded() ? t("post.flat_view") : t("post.threaded_view")}</span>
                </button>
              </Show>
              <Show when={!!props.handlers.onRefresh}>
                <button
                  onClick={() => { onRefresh(); setMoreDropdownOpen(false); }}
                  disabled={refreshing()}
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors text-left disabled:opacity-50"
                >
                  <MdOutlineRefresh size={15} class={refreshing() ? "animate-spin" : ""} />
                  <span>{t("post.refresh")}</span>
                </button>
              </Show>
              <Show when={canFolder()}>
                <button
                  onClick={() => { toggleFolderPicker(); setMoreDropdownOpen(false); }}
                  class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                         ${showFolderPicker() || hasFolders() ? "text-accent" : "text-txt"}`}
                >
                  <Show when={hasFolders()} fallback={<MdFillFolder_open size={15} />}>
                    <MdFillFolder size={15} />
                  </Show>
                  <span>{t("post.save_to_folder")}</span>
                </button>
              </Show>
              <Show when={canDelete()}>
                <button
                  onClick={onDeleteClick}
                  class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                         ${deleteConfirming() ? "text-red-500" : "text-txt"}`}
                >
                  <MdOutlineDelete size={15} />
                  <span>{deleteConfirming() ? t("post.confirm_delete") : t("post.delete")}</span>
                </button>
              </Show>
            </div>
          </Show>
        </div>

        {/* ── Reply: always visible ── */}
        <button
          onClick={() => { setReplyOpen((v) => !v); if (!showComments()) toggleComments(); }}
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                 text-muted hover:bg-overlay hover:text-txt transition-colors"
          title={t("post.reply")}
        >
          <MdOutlineReply size={17} />
          <span>{t("post.reply")}</span>
        </button>

        {/* ── Delete: desktop only (mobile is in more dropdown) ── */}
        <Show when={canDelete()}>
          <button
            onClick={onDeleteClick}
            title={t("post.delete_post")}
            class={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none
                   ${deleteConfirming()
                     ? "text-red-500 hover:bg-red-500/10"
                     : "text-muted hover:bg-overlay hover:text-red-400"}`}
          >
            <MdOutlineDelete size={17} />
            <Show when={deleteConfirming()}>
              <span>{t("post.confirm")}</span>
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
              <span>{t("post.reshare_with_comment")}</span>
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
      <Show when={showFolderPicker()}>
        <FolderPicker
          loading={folderPickerLoading()}
          itemFolders={itemFolders()}
          allFolders={allFolders()}
          saving={folderSaving()}
          newInput={newFolderInput()}
          onSetInput={setNewFolderInput}
          onToggle={toggleFolder}
          onAdd={addNewFolder}
        />
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
        <div class="mt-3 text-sm text-muted animate-pulse">{t("post.loading_comments")}</div>
      </Show>
      <CommentThread
        comments={visibleComments()}
        show={showComments() && !commentsLoading()}
        handlers={props.handlers}
        highlightUuid={props.highlightUuid}
        postAuthorAddress={props.post.authorAddress}
      />

      <Show when={rssImportedUuid()}>
        {(uuid) => (
          <PostDetailModal
            uuid={uuid()}
            onClose={() => setRssImportedUuid(null)}
          />
        )}
      </Show>
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
  const { t } = useI18n();
  const tabs = () => {
    const d = props.data;
    if (!d) return [];
    return [
      { key: "likes" as const, label: t("post.likes"), count: d.likes.length },
      { key: "dislikes" as const, label: t("post.dislikes"), count: d.dislikes.length },
      { key: "repeats" as const, label: t("post.repeats"), count: d.repeats.length },
    ].filter(tab => tab.count > 0);
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
        <div class="text-xs text-muted animate-pulse">{t("post.loading")}</div>
      </Show>
      <Show when={!props.loading && props.data}>
        <Show
          when={tabs().length > 0}
          fallback={<div class="text-xs text-muted">{t("post.no_activity")}</div>}
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
  const { t } = useI18n();
  const typed = () => props.data as ItemSourceResponse | null;
  return (
    <div class="mt-3 pt-3 border-t border-rim text-xs">
      <Show when={props.loading}>
        <div class="text-muted animate-pulse">{t("post.loading_source")}</div>
      </Show>
      <Show when={!props.loading && typed()?.error}>
        <div class="text-red-500">{typed()!.error}</div>
      </Show>
      <Show when={!props.loading && typed() && !typed()?.error}>
        <div class="flex flex-wrap gap-x-4 gap-y-0.5 mb-2 text-muted font-mono">
          <span>id: <span class="text-txt">{typed()!.id}</span></span>
          <span>uuid: <span class="text-txt">{typed()!.uuid}</span></span>
          <span>{typed()!.cached ? t("post.cached") : t("post.generated")}</span>
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

function FolderPicker(props: {
  loading: boolean;
  itemFolders: string[];
  allFolders: string[];
  saving: string | null;
  newInput: string;
  onSetInput: (v: string) => void;
  onToggle: (name: string) => void;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  const mergedFolders = () => {
    const all = new Set([...props.allFolders, ...props.itemFolders]);
    return [...all].sort();
  };

  return (
    <div class="mt-3 pt-3 border-t border-rim">
      <Show when={props.loading}>
        <div class="flex gap-1.5 flex-wrap">
          <For each={Array(3)}>{() =>
            <div class="h-7 w-20 rounded-lg bg-overlay animate-pulse" />
          }</For>
        </div>
      </Show>
      <Show when={!props.loading}>
        <Show
          when={mergedFolders().length > 0}
          fallback={
            <p class="text-xs text-muted mb-2">{t("post.no_folders_yet")}</p>
          }
        >
          <div class="flex flex-wrap gap-1.5 mb-2">
            <For each={mergedFolders()}>
              {(folder) => {
                const inFolder = () => props.itemFolders.includes(folder);
                const saving = () => props.saving === folder;
                return (
                  <button
                    onClick={() => props.onToggle(folder)}
                    disabled={!!props.saving}
                    class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs
                           transition-colors disabled:opacity-60 select-none"
                    classList={{
                      "bg-accent text-accent-fg font-medium": inFolder(),
                      "bg-overlay text-muted hover:bg-elevated hover:text-txt": !inFolder(),
                    }}
                    title={inFolder() ? `Remove from "${folder}"` : `Save to "${folder}"`}
                  >
                    <Show when={saving()} fallback={
                      <Show when={inFolder()} fallback={<MdFillFolder_open size={12} />}>
                        <MdFillFolder size={12} class="shrink-0" />
                      </Show>
                    }>
                      <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </Show>
                    <span class="truncate max-w-[100px]">{folder}</span>
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
        <div class="flex gap-1.5">
          <input
            type="text"
            placeholder={t("post.new_folder_placeholder")}
            value={props.newInput}
            onInput={(e) => props.onSetInput(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && props.onAdd()}
            class="flex-1 h-7 text-xs border border-rim rounded-lg bg-surface text-txt
                   placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent px-2"
          />
          <button
            onClick={props.onAdd}
            disabled={!props.newInput.trim() || !!props.saving}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                   bg-accent text-accent-fg disabled:opacity-40 transition-colors"
          >
            <MdFillAdd size={13} />
            <span>{t("post.add_folder")}</span>
          </button>
        </div>
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
