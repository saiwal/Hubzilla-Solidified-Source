// src/shared/stream/components/PostCard.tsx
import {
  createSignal,
  createEffect,
  untrack,
  onMount,
  onCleanup,
  lazy,
  Show,
  For,
} from "solid-js";
import { Portal } from "solid-js/web";
import { useThreadMode } from "@/shared/store/thread-mode";
import AuthorPopover from "./AuthorPopover";
import type { ThreadNode } from "@/shared/lib/thread";
import { countAllComments } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import CommentThread from "@/shared/views/CommentThread";
import formatPostDate from "@/shared/lib/date";
import { markItemSeen } from "@/shared/lib/markSeen";
import { scrollHighlightIntoView } from "@/shared/lib/scrollHighlightIntoView";
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
  MdOutlineCloud_download,
  MdFillNotifications,
  MdOutlineNotifications_none,
  MdOutlineCode,
  MdOutlineEdit,
  MdOutlineReply,
  MdFillFolder,
  MdFillFolder_open,
  MdFillAdd,
  MdFillUnfold_more,
  MdFillMore_vert,
  MdOutlineSend,
  MdOutlineLocation_on,
  MdOutlineTimer,
  MdOutlineSchedule,
  MdOutlineContent_copy,
  MdOutlineCheck,
  MdFillPush_pin,
  MdOutlinePush_pin,
} from "solid-icons/md";
import { useI18n } from "@/i18n";
import { BiRegularLinkExternal, BiSolidShareAlt, BiRegularEnvelope } from "solid-icons/bi";
const CommentComposer = lazy(
  () => import("@/shared/editor/composers/CommentComposer"),
);
import RichEditor from "@/shared/editor/core/RichEditor";
import { CAPABILITIES } from "@/shared/editor/types/editor.types";
import type { EditorTab } from "@/shared/editor/types/editor.types";
const PostComposer = lazy(
  () => import("@/shared/editor/composers/PostComposer"),
);
import DOMPurify from "dompurify";
import { decryptPayload, getPayloadHint } from "@/shared/lib/postCrypto";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import { handleNsfwToggleClick } from "@/shared/lib/nsfw";
import { useAuth } from "@/shared/store/auth-store";
import {
  apiFollowPost,
  apiUnfollowPost,
  apiFetchItemFolders,
  apiSaveToFolder,
  apiFetchComposeSource,
} from "@/shared/lib/item-api";
import { fetchFolders } from "@/modules/network/api";
import EventCard from "./EventCard";
import PollCard from "./PollCard";
import { parseEventData } from "@/shared/lib/activity.mapper";
import AttachmentList from "./AttachmentList";
import { apiFetch } from "@/shared/lib/fetch";
import { usePlyr } from "@/shared/lib/usePlyr";
const PostDetailModal = lazy(() => import("@/shared/views/PostDetailModal"));

export type { StreamHandlers as PostActions };

const BODY_COLLAPSED_MAX_PX = 310;

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
  return nodes.some((n) => n.children.length > 0);
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

function InlineEditForm(props: {
  body: string;
  onBodyChange: (v: string) => void;
  title?: string;
  onTitleChange?: (v: string) => void;
  showTitle: boolean;
  tab: EditorTab;
  onTabChange: (t: EditorTab) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  minHeight: string;
}) {
  const { t } = useI18n();
  return (
    <div class="mt-2 space-y-2">
      <Show when={props.showTitle}>
        <input
          type="text"
          value={props.title ?? ""}
          onInput={(e) => props.onTitleChange?.(e.currentTarget.value)}
          placeholder={t("editor.title_placeholder")}
          class="w-full px-2 py-1.5 text-sm font-medium rounded-lg border border-rim bg-surface text-txt outline-none focus:border-rim-strong"
        />
      </Show>
      <RichEditor
        body={props.body}
        onInput={props.onBodyChange}
        capabilities={CAPABILITIES.comment}
        tab={props.tab}
        onTabChange={props.onTabChange}
        onCtrlEnter={props.onSave}
        minHeight={props.minHeight}
      />
      <Show when={props.error}>
        <div class="text-xs text-red-500">{props.error}</div>
      </Show>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          class="px-3 py-1 text-xs rounded-lg border border-rim text-muted hover:bg-elevated transition-colors"
        >
          {t("editor.cancel_btn")}
        </button>
        <button
          type="button"
          onClick={props.onSave}
          disabled={props.saving || !props.body.trim()}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-accent text-accent-fg
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {props.saving ? t("editor.saving") : t("editor.save_changes")}
        </button>
      </div>
    </div>
  );
}

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
  expandAll?: boolean;
}) {
  const threadMode = useThreadMode();
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [replyQuote, setReplyQuote] = createSignal("");
  const [reshareOpen, setReshareOpen] = createSignal(false);
  const [shareEmbedCopied, setShareEmbedCopied] = createSignal(false);
  function copyShareEmbed() {
    navigator.clipboard.writeText(`[share=${props.post.iid}][/share]`).then(() => {
      setShareEmbedCopied(true);
      setTimeout(() => setShareEmbedCopied(false), 1500);
    });
  }
  const [showComments, setShowComments] = createSignal(
    !!props.initiallyExpanded ||
      openedByMid.has(props.post.mid) ||
      (!props.compact && !!props.highlightUuid) ||
      (!!props.compact &&
        !!props.highlightUuid &&
        subtreeContainsUuid(props.post.children, props.highlightUuid)),
  );
  const [threaded, setThreaded] = createSignal(threadMode());
  const [commentsLoaded, setCommentsLoaded] = createSignal(
    props.post.children.length > 0,
  );
  const [commentsLoading, setCommentsLoading] = createSignal(false);
  const [deleteConfirming, setDeleteConfirming] = createSignal(false);
  const [isEditing, setIsEditing] = createSignal(false);
  const [editBody, setEditBody] = createSignal("");
  const [editTitle, setEditTitle] = createSignal("");
  const [editTab, setEditTab] = createSignal<EditorTab>("wysiwyg");
  const [editSaving, setEditSaving] = createSignal(false);
  const [editError, setEditError] = createSignal<string | null>(null);
  const [refreshing, setRefreshing] = createSignal(false);
  const [following, setFollowing] = createSignal(
    props.post.viewerFollowing ?? false,
  );
  const [followPending, setFollowPending] = createSignal(false);
  const [repeatDropdownOpen, setRepeatDropdownOpen] = createSignal(false);
  const [dropdownAnchor, setDropdownAnchor] = createSignal<{
    top: number;
    left: number;
  } | null>(null);
  const [moreDropdownOpen, setMoreDropdownOpen] = createSignal(false);
  const [moreDropdownAnchor, setMoreDropdownAnchor] = createSignal<{
    bottom: number;
    right: number;
  } | null>(null);
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
  const [rssImportedUuid, setRssImportedUuid] = createSignal<string | null>(
    null,
  );
  const [showFolderPicker, setShowFolderPicker] = createSignal(false);
  const [itemFolders, setItemFolders] = createSignal<string[]>([]);
  const [allFolders, setAllFolders] = createSignal<string[]>([]);
  const [folderPickerLoading, setFolderPickerLoading] = createSignal(false);
  const [folderSaving, setFolderSaving] = createSignal<string | null>(null);
  const [newFolderInput, setNewFolderInput] = createSignal("");
  const [showDeliveryReport, setShowDeliveryReport] = createSignal(false);
  const [deliveryReportLoading, setDeliveryReportLoading] = createSignal(false);
  const [deliveryReportData, setDeliveryReportData] = createSignal<
    DeliveryEntry[] | null
  >(null);
  let repeatDropdownRef!: HTMLDivElement;
  let repeatDropdownPortalRef!: HTMLDivElement;
  let moreDropdownRef!: HTMLDivElement;
  let moreDropdownPortalRef!: HTMLDivElement;
  let deleteTimer: ReturnType<typeof setTimeout> | null = null;
  const { locale, t } = useI18n();
  const auth = useAuth();
  let cardRef!: HTMLDivElement;
  const [bodyRef, setBodyRef] = createSignal<HTMLElement>();
  usePlyr(bodyRef, () => props.post.body);
  const [bodyExpanded, setBodyExpanded] = createSignal(false);
  const [bodyOverflows, setBodyOverflows] = createSignal(false);
  const checkBodyOverflow = () => {
    const el = bodyRef();
    if (!el) return;
    const prev = el.style.maxHeight;
    el.style.maxHeight = "none";
    const natural = el.scrollHeight;
    el.style.maxHeight = prev;
    setBodyOverflows(natural > BODY_COLLAPSED_MAX_PX);
  };
  // Captured on mouseup (while the selection still exists) rather than on the
  // Reply click itself — clicking the Reply button collapses the selection
  // before its own click handler runs.
  let lastSelectedText = "";
  function handleBodyMouseUp() {
    const text = window.getSelection()?.toString().trim();
    if (text) lastSelectedText = text;
  }
  function openReply() {
    const opening = !replyOpen();
    if (opening) {
      setReplyQuote(
        lastSelectedText
          ? `[quote=${props.post.authorName}]${lastSelectedText}[/quote]\n`
          : "",
      );
      lastSelectedText = "";
    }
    setReplyOpen(opening);
  }

  // Detect event posts: prefer pre-parsed eventData from mapper, fall back to
  // parsing the body directly (handles cases where obj_type wasn't "Event").
  const isUnseen = () => props.post.flags.includes("unseen");
  const isExpired = () => props.post.flags.includes("expired");
  // Expiry set and still in the future — the post will self-destruct.
  const isExpiring = () =>
    !isExpired() &&
    !!props.post.expires &&
    new Date(props.post.expires + "Z").getTime() > Date.now();
  const expiresTitle = () =>
    `${t("post.expires")}: ${new Date(props.post.expires! + "Z").toLocaleString(locale())}`;
  // Delayed publish — created holds the future publish time until the cron fires.
  const isScheduled = () => props.post.flags.includes("scheduled");
  const scheduledTitle = () =>
    `${t("post.scheduled_title")}: ${new Date(props.post.created + "Z").toLocaleString(locale())}`;
  // item_private === 2 — a direct message between individuals (classic Hubzilla's
  // bi-envelope lock icon), distinct from a merely-private post (item_private === 1).
  const isDirectMessage = () => props.post.flags.includes("direct_message");
  const locationHref = () =>
    props.post.coord
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(props.post.coord)}`
      : undefined;
  const isRepeat = () => props.post.verb === "Announce";
  const editedAt = () =>
    props.post.edited && props.post.edited !== props.post.created
      ? props.post.edited
      : undefined;

  const eventData = () =>
    props.post.eventData ??
    (props.post.body.includes("[event-summary]")
      ? parseEventData(props.post.body)
      : undefined);

  const totalComments = () =>
    props.post.children.length > 0
      ? countAllComments(props.post.children)
      : (props.post.commentCount ?? 0);

  // Folder: local users only, post must be in their stream (iid present)
  const canFolder = () => auth()?.isLocal === true && !!props.post.iid;
  const hasFolders = () => itemFolders().length > 0;

  // Star: only meaningful for local authenticated users
  const canStar = () => !!props.handlers.onStar && auth()?.isLocal === true;

  // Pin: channel wall owner only, top-level non-private posts (backend
  // re-validates this — these are UI-visibility gates, not the source of truth).
  const canPin = () =>
    !!props.handlers.onPin &&
    ownsStreamCopy() &&
    props.post.item_thread_top === 1 &&
    !isPrivate();
  const isPinned = () => props.post.pinned ?? false;
  function onPinClick() {
    props.handlers.onPin?.(props.post.mid);
    setMoreDropdownOpen(false);
  }

  // Follow: local users on thread-top posts only — core attaches the
  // Follow/Ignore state to the thread top (mirrors thread_action_menu()).
  const canFollow = () =>
    auth()?.isLocal === true &&
    !!props.post.uuid &&
    (props.post.item_thread_top === 1 || props.post.mid === props.post.top_mid);

  // Reshare: only local users can reshare posts that have a local iid.
  // Private posts can't be reshared at all (the server refuses to embed or
  // announce them), so their reshare controls are hidden entirely.
  const isPrivate = () => props.post.flags?.includes("private") ?? false;
  const canReshare = () => auth()?.isLocal === true && !!props.post.iid;

  // Like/dislike/plain-repeat/reply all federate against the existing item
  // (backend accepts local_channel() or remote_channel()) — any logged-in
  // viewer can use them, not just native local users.
  const canInteract = () => auth()?.isLoggedIn === true;

  const canViewSource = () => auth()?.isLocal === true && !!props.post.iid;

  const canDeliveryReport = () => {
    const a = auth();
    if (!a?.isLocal || !a.nick) return false;
    const viewerAddr = `${a.nick}@${window.location.hostname}`;
    return (
      !!props.post.authorAddress && props.post.authorAddress === viewerAddr
    );
  };

  // True authorship: viewer's own channel address matches the post's author.
  const isTrueAuthor = () => {
    const a = auth();
    if (!a?.isLocal || !a.nick) return false;
    const viewerAddr = `${a.nick}@${window.location.hostname}`;
    return (
      !!props.post.authorAddress && props.post.authorAddress === viewerAddr
    );
  };

  // Own stream copy: this row lives under the viewer's own uid (their own
  // Network stream or wall), even if they didn't author it. The backend
  // removes it locally only in this case, never federating the delete.
  const ownsStreamCopy = () => {
    const a = auth();
    return !!a && a.uid > 0 && props.post.profileUid === a.uid;
  };

  // Delete: viewer must be a local user, and either the true author/owner or
  // merely own this stream copy (see isLocalOnlyDelete for the label split).
  const canDelete = () => {
    if (!props.handlers.onDelete) return false;
    return isTrueAuthor() || ownsStreamCopy();
  };

  const isLocalOnlyDelete = () => ownsStreamCopy() && !isTrueAuthor();

  const deleteLabel = () =>
    isLocalOnlyDelete() ? t("post.remove_from_feed") : t("post.delete");

  const deleteConfirmLabel = () =>
    isLocalOnlyDelete()
      ? t("post.confirm_remove_from_feed")
      : t("post.confirm_delete");

  // Edit: same author-address gate as delete
  const canEdit = () => {
    const a = auth();
    if (!props.handlers.onEdit || !a?.isLocal || !a.nick) return false;
    const viewerAddr = `${a.nick}@${window.location.hostname}`;
    return (
      !!props.post.authorAddress && props.post.authorAddress === viewerAddr
    );
  };

  function startEdit() {
    const initialBody = props.post.rawBody ?? "";
    setEditTitle(props.post.title ?? "");
    setEditBody(initialBody);
    setEditTab("wysiwyg");
    setEditError(null);
    setIsEditing(true);
    setMoreDropdownOpen(false);
    // Upgrade to the server's compose source, which collapses [share …]
    // blocks to compact [share=<id>] tags the editor can round-trip. Skip
    // if the user already started typing meanwhile.
    apiFetchComposeSource(props.post.uuid)
      .then((src) => {
        if (src?.success && src.body && editBody() === initialBody) {
          setEditBody(src.body);
        }
      })
      .catch(() => {});
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditError(null);
  }

  async function saveEdit() {
    const body = editBody().trim();
    if (!body) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await props.handlers.onEdit?.(props.post.mid, body, editTitle().trim());
      setIsEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setEditSaving(false);
    }
  }

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

  async function handleBodyClick(e: MouseEvent) {
    if (handleNsfwToggleClick(e)) return;

    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-crypt-payload]",
    );
    if (!btn) return;
    e.stopPropagation();

    const payload = btn.dataset.cryptPayload ?? "";
    const hint = getPayloadHint(payload);

    const form = document.createElement("form");
    form.className = "hz-decrypt-form flex flex-col gap-2 my-1";

    const hintHtml = DOMPurify.sanitize(hint || "Enter passphrase");
    form.innerHTML = `
      <span class="text-muted text-xs">🔒 ${hintHtml}</span>
      <div class="flex items-center gap-2">
        <input type="password" placeholder="Passphrase" autofocus
          class="hz-decrypt-input flex-1 bg-surface border border-rim rounded px-2 py-1 text-sm text-txt outline-none focus:border-rim-strong" />
        <button type="submit"
          class="px-3 py-1 rounded bg-accent text-accent-fg text-xs font-semibold hover:opacity-90 whitespace-nowrap">
          Decrypt
        </button>
        <button type="button" class="hz-decrypt-cancel px-2 py-1 rounded text-muted hover:text-txt text-xs">
          Cancel
        </button>
      </div>
      <span class="hz-decrypt-error text-xs text-red-400 hidden"></span>
    `;

    btn.replaceWith(form);
    form.querySelector<HTMLInputElement>(".hz-decrypt-input")?.focus();

    form.querySelector(".hz-decrypt-cancel")?.addEventListener("click", () => {
      form.replaceWith(btn);
    });

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const password =
        form.querySelector<HTMLInputElement>(".hz-decrypt-input")?.value ?? "";
      const submitBtn = form.querySelector<HTMLButtonElement>(
        "button[type=submit]",
      );
      const errorEl = form.querySelector<HTMLElement>(".hz-decrypt-error");
      if (!password) return;
      if (submitBtn) {
        submitBtn.textContent = "Decrypting…";
        submitBtn.disabled = true;
      }

      try {
        const plain = await decryptPayload(payload, password);
        const html = DOMPurify.sanitize(bbcodeToHtml(plain));
        const div = document.createElement("div");
        div.innerHTML = html;
        form.replaceWith(div);
      } catch (err) {
        if (errorEl) {
          errorEl.textContent =
            err instanceof Error ? err.message : "Decryption failed";
          errorEl.classList.remove("hidden");
        }
        if (submitBtn) {
          submitBtn.textContent = "Decrypt";
          submitBtn.disabled = false;
        }
      }
    });
  }

  onMount(() => {
    if (props.highlighted && props.compact) {
      onCleanup(scrollHighlightIntoView(cardRef));
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

  onMount(() => {
    if (props.compact || props.seamless) return;
    checkBodyOverflow();
    const imgs = bodyRef()?.querySelectorAll("img");
    imgs?.forEach((img) => {
      if (!img.complete)
        img.addEventListener("load", checkBodyOverflow, { once: true });
    });
  });

  onCleanup(() => {
    if (deleteTimer) clearTimeout(deleteTimer);
  });

  createEffect(() => {
    if (!repeatDropdownOpen()) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !repeatDropdownRef?.contains(t) &&
        !repeatDropdownPortalRef?.contains(t)
      )
        setRepeatDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  createEffect(() => {
    if (!moreDropdownOpen()) return;
    const handler = (e: MouseEvent) => {
      if (
        !moreDropdownRef?.contains(e.target as Node) &&
        !moreDropdownPortalRef?.contains(e.target as Node)
      )
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
    setRepeatDropdownOpen((v) => !v);
  }

  function openMoreDropdown() {
    if (!moreDropdownOpen()) {
      const rect = moreDropdownRef.getBoundingClientRect();
      setMoreDropdownAnchor({
        bottom: window.innerHeight - rect.top + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setMoreDropdownOpen((v) => !v);
  }

  const isRss = () =>
    props.post.authorNetwork === "rss" && !!props.post.permalink;

  async function handleRssImport() {
    if (rssImporting()) return;
    setRssImporting(true);
    try {
      const res = await apiFetch(
        `/spa/search/import?url=${encodeURIComponent(props.post.permalink)}`,
      );
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
        setAllFolders((prev) => [...prev, name].sort());
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

  function onLike() {
    props.handlers.onLike(props.post.mid);
  }
  function onDislike() {
    props.handlers.onDislike(props.post.mid);
  }
  function onRepeat() {
    props.handlers.onRepeat(props.post.mid);
  }
  function onStar() {
    props.handlers.onStar?.(props.post.mid);
  }

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
    if (!props.post.uuid || followPending()) return;
    const next = !following();
    setFollowing(next);
    setFollowPending(true);
    try {
      await (next
        ? apiFollowPost(props.post.uuid)
        : apiUnfollowPost(props.post.uuid));
    } catch {
      setFollowing(!next);
    } finally {
      setFollowPending(false);
    }
  }

  async function toggleStats() {
    if (showStats()) {
      setShowStats(false);
      return;
    }
    setShowStats(true);
    if (statsData()) return;
    setStatsLoading(true);
    try {
      const uuid = encodeURIComponent(props.post.uuid);
      const base = `/spa/item/${uuid}`;
      const [likesRes, dislikesRes, repeatsRes] = await Promise.all([
        fetch(`${base}/likes`, { credentials: "include" }),
        fetch(`${base}/dislikes`, { credentials: "include" }),
        fetch(`${base}/repeats`, { credentials: "include" }),
      ]);
      const parse = async (res: Response): Promise<StatActor[]> => {
        if (!res.ok) return [];
        const data = await res.json();
        const arr = Array.isArray(data)
          ? data
          : (data?.reactions ?? data?.result ?? []);
        return arr.map((a: any) => ({
          name: a.name ?? t("post.unknown"),
          avatar: a.photo ?? undefined,
          url: a.url ?? undefined,
        }));
      };
      const [likes, dislikes, repeats] = await Promise.all([
        parse(likesRes),
        parse(dislikesRes),
        parse(repeatsRes),
      ]);
      setStatsData({ likes, dislikes, repeats });
    } finally {
      setStatsLoading(false);
    }
  }

  async function toggleSource() {
    if (showSource()) {
      setShowSource(false);
      return;
    }
    setShowSource(true);
    if (sourceData()) return;
    setSourceLoading(true);
    try {
      const res = await fetch(`/spa/item-source/${props.post.iid}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setSourceData(await res.json());
    } catch (e) {
      setSourceData({ error: String(e) });
    } finally {
      setSourceLoading(false);
    }
  }

  async function toggleDeliveryReport() {
    if (showDeliveryReport()) {
      setShowDeliveryReport(false);
      return;
    }
    setShowDeliveryReport(true);
    if (deliveryReportData()) return;
    setDeliveryReportLoading(true);
    try {
      const res = await fetch(
        `/spa/item/${encodeURIComponent(props.post.uuid)}/delivery`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setDeliveryReportData(json?.data ?? []);
    } catch {
      setDeliveryReportData([]);
    } finally {
      setDeliveryReportLoading(false);
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

  // When a parent post requests expanding all nested threads, open this one.
  // Uses untrack so manual closes aren't overridden by a re-run of the effect.
  createEffect(() => {
    if (props.expandAll && !untrack(showComments)) {
      toggleComments();
    }
  });

  // ── Full layout expand-all state ─────────────────────────────────────────
  // Initialised from props.expandAll so callers (e.g. PostDetailModal) can
  // pre-expand all nested threads on mount.
  const [expandAll, setExpandAll] = createSignal(props.expandAll ?? false);

  async function handleExpandAll() {
    if (!showComments()) {
      await toggleComments();
    }
    setExpandAll(true);
  }

  // ── Compact (comment) layout ──────────────────────────────────────────────
  if (props.compact) {
    return (
      <div
        ref={cardRef}
        style="overflow-anchor: none"
        class={`relative border-l-2 pl-2 md:pl-3 py-2 md:py-2.5 mb-1 transition-colors duration-500
               ${props.highlighted ? "border-accent bg-accent/5" : "border-rim/60"}`}
      >
        <Show when={isPinned()}>
          <span
            class="absolute top-1 right-1 z-10 flex items-center justify-center w-4 h-4 rounded-full bg-accent text-accent-fg leading-none"
            title={t("post.pinned_indicator")}
          >
            <MdFillPush_pin size={9} />
          </span>
        </Show>
        {/* Single-line author header */}
        <div class="flex items-center gap-2 min-w-0">
          <Show when={isUnseen()}>
            <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          </Show>
          <AuthorPopover
            name={props.post.authorName}
            avatar={props.post.authorAvatar}
            url={props.post.authorUrl}
            hash={props.post.authorHash}
            address={props.post.authorAddress}
            network={props.post.authorNetwork}
          >
            <Show
              when={props.post.authorAvatar}
              fallback={
                <div
                  class="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-txt
                            shrink-0 flex items-center justify-center text-accent-fg text-[10px] font-bold cursor-pointer"
                >
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
          <Show
            when={
              props.postAuthorAddress &&
              props.post.authorAddress === props.postAuthorAddress
            }
          >
            <span
              class="shrink-0 px-1 py-px rounded text-[10px] font-bold leading-none bg-accent text-accent-fg"
              title={t("post.op_title")}
            >
              {t("post.op")}
            </span>
          </Show>
          <a
            href={`/chanview?f=&hash=${encodeURIComponent(props.post.authorHash || props.post.authorUrl)}`}
            class="font-medium text-sm text-txt hover:underline truncate"
          >
            {props.post.authorName}
          </a>
          <Show
            when={
              props.post.verb && props.post.verb !== "Create" && !isRepeat()
            }
          >
            <span class="text-xs text-muted italic shrink-0">
              {props.post.verb?.toLowerCase()}
            </span>
          </Show>
          <Show when={editedAt()}>
            {(edited) => (
              <MdOutlineEdit
                size={11}
                class="text-muted shrink-0"
                title={`${t("post.edited")}: ${new Date(edited() + "Z").toLocaleString(locale())}`}
              />
            )}
          </Show>
          <span
            class="text-xs text-muted shrink-0 ml-1"
            title={new Date(props.post.created + "Z").toLocaleString(locale())}
          >
            {formatPostDate(props.post.created, locale())}
          </span>
          <Show when={isExpired()}>
            <span
              class="shrink-0 px-1 py-px rounded text-[10px] font-bold leading-none bg-muted/30 text-muted"
              title={t("post.expired_title")}
            >
              {t("post.expired_badge")}
            </span>
          </Show>
          <Show when={isExpiring()}>
            <span
              class="flex items-center gap-0.5 shrink-0 px-1 py-px rounded text-[10px] font-medium leading-none bg-amber-500/15 text-amber-600 dark:text-amber-400"
              title={expiresTitle()}
            >
              <MdOutlineTimer size={10} />
              {formatPostDate(props.post.expires!, locale())}
            </span>
          </Show>
          <Show when={isScheduled()}>
            <span
              class="flex items-center gap-0.5 shrink-0 px-1 py-px rounded text-[10px] font-medium leading-none bg-sky-500/15 text-sky-600 dark:text-sky-400"
              title={scheduledTitle()}
            >
              <MdOutlineSchedule size={10} />
              {t("post.scheduled_badge")} · {formatPostDate(props.post.created, locale())}
            </span>
          </Show>
          <Show when={isDirectMessage()}>
            <span
              class="flex items-center gap-0.5 shrink-0 px-1 py-px rounded text-[10px] font-medium leading-none bg-violet-500/15 text-violet-600 dark:text-violet-400"
              title={t("post.dm_title")}
            >
              <BiRegularEnvelope size={10} />
              {t("post.dm_badge")}
            </span>
          </Show>
          <Show when={props.post.location}>
            <span
              class="flex items-center gap-0.5 min-w-0 text-[10px] text-muted"
              title={props.post.location}
            >
              <MdOutlineLocation_on size={10} class="shrink-0" />
              <span class="truncate max-w-[8rem]">{props.post.location}</span>
            </span>
          </Show>
        </div>

        {/* Event card (compact) */}
        <Show when={eventData()}>
          {(ev) => <EventCard post={props.post} event={ev()} />}
        </Show>

        {/* Poll card (compact) */}
        <Show when={props.post.poll}>
          {(poll) => <PollCard uuid={props.post.uuid} poll={poll()} />}
        </Show>

        {/* Body — no title rendered for comments */}
        <Show
          when={!isEditing()}
          fallback={
            <InlineEditForm
              body={editBody()}
              onBodyChange={setEditBody}
              showTitle={false}
              tab={editTab()}
              onTabChange={setEditTab}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={editSaving()}
              error={editError()}
              minHeight="60px"
            />
          }
        >
          <Show when={!eventData() && !props.post.poll}>
            <div
              ref={setBodyRef}
              class="mt-1.5 prose prose-sm dark:prose-invert max-w-none text-muted
                     prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                     prose-blockquote:not-italic prose-blockquote:border-accent
                     prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:text-txt
                     prose-code:before:content-none prose-code:after:content-none
                     prose-img:rounded-lg prose-img:my-1 break-words
                     prose-p:my-1 prose-p:leading-snug"
              innerHTML={props.post.body}
              onClick={handleBodyClick}
              onMouseUp={handleBodyMouseUp}
            />
          </Show>
        </Show>

        <Show when={(props.post.attachments?.length ?? 0) > 0}>
          <AttachmentList attachments={props.post.attachments!} compact />
        </Show>

        {/* Compact action bar */}
        <div class="mt-2 flex items-center gap-0.5 flex-wrap">
          <Show when={canInteract()}>
            <CompactActionBtn
              icon={
                props.post.viewerLiked ? (
                  <MdFillThumb_up size={14} />
                ) : (
                  <MdOutlineThumb_up size={14} />
                )
              }
              count={props.post.likeCount}
              label={t("post.like")}
              onClick={onLike}
              active={props.post.viewerLiked}
            />
            <CompactActionBtn
              icon={
                props.post.viewerDisliked ? (
                  <MdFillThumb_down size={14} />
                ) : (
                  <MdOutlineThumb_down size={14} />
                )
              }
              count={props.post.dislikeCount}
              label={t("post.dislike")}
              onClick={onDislike}
              active={props.post.viewerDisliked}
            />
          </Show>
          <Show when={canStar()}>
            <button
              onClick={onStar}
              title={
                props.post.viewerStarred ? t("post.unstar") : t("post.star")
              }
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none hover:bg-overlay
                     ${props.post.viewerStarred ? "text-yellow-500" : "text-subtle hover:text-txt"}`}
            >
              <Show
                when={props.post.viewerStarred}
                fallback={<MdFillStar_border size={14} />}
              >
                <MdFillStar size={14} />
              </Show>
            </button>
          </Show>
          <Show when={!isPrivate() && canInteract()}>
          <Show
            when={canReshare()}
            fallback={
              <CompactActionBtn
                icon={
                  props.post.viewerRepeated ? (
                    <MdFillShare size={14} />
                  ) : (
                    <MdOutlineShare size={14} />
                  )
                }
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
                {props.post.viewerRepeated ? (
                  <MdFillShare size={14} />
                ) : (
                  <MdOutlineShare size={14} />
                )}
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
          </Show>

          <Show when={canFolder()}>
            <button
              onClick={toggleFolderPicker}
              title={t("post.save_to_folder")}
              class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     transition-colors select-none hover:bg-overlay
                     ${showFolderPicker() || hasFolders() ? "text-accent" : "text-subtle hover:text-txt"}`}
            >
              <Show
                when={hasFolders()}
                fallback={<MdFillFolder_open size={14} />}
              >
                <MdFillFolder size={14} />
              </Show>
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
              <MdOutlineCloud_download
                size={14}
                classList={{ "animate-spin": rssImporting() }}
              />
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

          {/* Thread/flat toggle — compact, hidden when sub-comments collapsed */}
          <Show when={showComments() && hasNestedComments(props.post.children)}>
            <button
              onClick={() => setThreaded((v) => !v)}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     text-subtle hover:bg-overlay hover:text-txt transition-colors"
              title={
                threaded() ? t("post.toggle_flat") : t("post.toggle_threaded")
              }
            >
              <Show
                when={threaded()}
                fallback={<MdFillAccount_tree size={14} />}
              >
                <MdFillFormat_list_bulleted size={14} />
              </Show>
            </button>
          </Show>

          {/* spacer keeps the trailing controls right-aligned even when the
              reply button is hidden (comments not allowed) */}
          <span class="ml-auto" />
          <Show when={canInteract() && props.post.canComment !== false}>
            <button
              onClick={openReply}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     text-subtle hover:bg-overlay hover:text-txt transition-colors"
              title={t("post.reply")}
            >
              <MdOutlineReply size={14} />
            </button>
          </Show>

          <Show
            when={
              canDelete() ||
              canEdit() ||
              canFollow() ||
              canPin() ||
              canViewSource() ||
              canDeliveryReport() ||
              props.post.likeCount > 0 ||
              props.post.dislikeCount > 0 ||
              props.post.repeatCount > 0 ||
              !!props.post.permalink
            }
          >
            <div ref={moreDropdownRef} class="relative">
              <button
                onClick={openMoreDropdown}
                title={t("post.more_actions")}
                class={`flex items-center px-1 py-1 rounded-md text-xs
                       transition-colors hover:bg-overlay
                       ${moreDropdownOpen() ? "text-accent" : "text-subtle"}`}
              >
                <MdFillMore_vert size={14} />
              </button>
            </div>
          </Show>
          <Portal>
            <Show when={moreDropdownOpen() && moreDropdownAnchor()}>
              <div
                ref={moreDropdownPortalRef}
                class="fixed z-[9999] min-w-[9rem] bg-surface border border-rim rounded-lg shadow-lg py-1"
                style={{
                  bottom: `${moreDropdownAnchor()!.bottom}px`,
                  right: `${moreDropdownAnchor()!.right}px`,
                }}
              >
                <Show when={canFollow()}>
                  <button
                    onClick={() => {
                      onFollowToggle();
                      setMoreDropdownOpen(false);
                    }}
                    disabled={followPending()}
                    class={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left disabled:opacity-50
                           ${following() ? "text-accent" : "text-txt"}`}
                  >
                    <Show
                      when={following()}
                      fallback={<MdOutlineNotifications_none size={13} />}
                    >
                      <MdFillNotifications size={13} />
                    </Show>
                    <span>
                      {following() ? t("post.unfollow") : t("post.follow")}
                    </span>
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
                    onClick={() => {
                      toggleStats();
                      setMoreDropdownOpen(false);
                    }}
                    class={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left
                           ${showStats() ? "text-accent" : "text-txt"}`}
                  >
                    <MdFillBar_chart size={13} />
                    <span>{t("post.statistics")}</span>
                  </button>
                </Show>
                <Show when={canViewSource()}>
                  <button
                    onClick={() => {
                      toggleSource();
                      setMoreDropdownOpen(false);
                    }}
                    class={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left
                           ${showSource() ? "text-accent" : "text-txt"}`}
                  >
                    <MdOutlineCode size={13} />
                    <span>{t("post.view_source")}</span>
                  </button>
                </Show>
                <Show when={!!props.post.permalink}>
                  <a
                    href={props.post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs text-txt hover:bg-overlay transition-colors"
                  >
                    <BiRegularLinkExternal size={13} />
                    <span>{t("post.original")}</span>
                  </a>
                </Show>
                <Show when={canDeliveryReport()}>
                  <button
                    onClick={() => {
                      toggleDeliveryReport();
                      setMoreDropdownOpen(false);
                    }}
                    class={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left
                           ${showDeliveryReport() ? "text-accent" : "text-txt"}`}
                  >
                    <MdOutlineSend size={13} />
                    <span>{t("post.delivery_report")}</span>
                  </button>
                </Show>
                <Show when={canPin()}>
                  <button
                    onClick={onPinClick}
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left text-txt"
                  >
                    <Show when={isPinned()} fallback={<MdOutlinePush_pin size={13} />}>
                      <MdFillPush_pin size={13} />
                    </Show>
                    <span>{isPinned() ? t("post.unpin") : t("post.pin")}</span>
                  </button>
                </Show>
                <Show when={canEdit()}>
                  <button
                    onClick={startEdit}
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left text-txt"
                  >
                    <MdOutlineEdit size={13} />
                    <span>{t("post.edit")}</span>
                  </button>
                </Show>
                <Show when={canDelete()}>
                  <button
                    onClick={onDeleteClick}
                    class={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-overlay transition-colors text-left
                           ${deleteConfirming() ? "text-red-500" : "text-txt"}`}
                  >
                    <MdOutlineDelete size={13} />
                    <span>
                      {deleteConfirming() ? deleteConfirmLabel() : deleteLabel()}
                    </span>
                  </button>
                </Show>
              </div>
            </Show>
          </Portal>
        </div>

        <Show when={replyOpen() && props.post.iid && props.post.profileUid}>
          <CommentComposer
            parentUuid={props.post.uuid}
            profileUid={props.post.profileUid!}
            initialBody={replyQuote() || undefined}
            onSubmitted={(body) => {
              props.handlers.onComment(
                props.post.mid,
                body,
                props.post.authorName,
                props.post.authorAvatar,
              );
              setReplyOpen(false);
              setShowComments(true);
            }}
          />
        </Show>
        <Portal>
          <Show when={repeatDropdownOpen() && dropdownAnchor()}>
            <div
              ref={repeatDropdownPortalRef}
              class="fixed z-[9999] min-w-[10rem] bg-surface border border-rim rounded-lg shadow-lg py-1"
              style={{
                top: `${dropdownAnchor()!.top}px`,
                left: `${dropdownAnchor()!.left}px`,
              }}
            >
              <div class="w-full flex items-center gap-2 px-3 py-2 text-xs text-txt hover:bg-overlay transition-colors">
                <button
                  onClick={() => {
                    setRepeatDropdownOpen(false);
                    setReshareOpen(true);
                  }}
                  class="flex items-center gap-2 flex-1 text-left"
                >
                  <BiSolidShareAlt size={13} />
                  <span>{t("post.reshare_with_comment")} #{props.post.iid}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyShareEmbed();
                  }}
                  title={t("post.copy_embed_code")}
                  aria-label={t("post.copy_embed_code")}
                  class="p-0.5 rounded hover:bg-surface transition-colors text-muted hover:text-txt shrink-0"
                >
                  <Show when={shareEmbedCopied()} fallback={<MdOutlineContent_copy size={13} />}>
                    <MdOutlineCheck size={13} class="text-accent" />
                  </Show>
                </button>
              </div>
            </div>
          </Show>
        </Portal>
        <Show when={reshareOpen() && props.post.iid && auth()?.uid}>
          <PostComposer
            open={true}
            onClose={() => setReshareOpen(false)}
            profileUid={auth()!.uid}
            initialBody={`\n[share=${props.post.iid}][/share]\n`}
            scopeKey={`post:reshare:${props.post.iid}`}
          />
        </Show>
        <Show when={showStats()}>
          <PostStats loading={statsLoading()} data={statsData()} />
        </Show>
        <Show when={showSource()}>
          <PostSource loading={sourceLoading()} data={sourceData()} />
        </Show>
        <Show when={showDeliveryReport()}>
          <DeliveryReport
            loading={deliveryReportLoading()}
            data={deliveryReportData()}
          />
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
          <div class="mt-2 ml-2 text-xs text-muted animate-pulse">
            {t("post.loading_comments")}
          </div>
        </Show>
        <CommentThread
          comments={visibleComments()}
          show={showComments() && !commentsLoading()}
          handlers={props.handlers}
          highlightUuid={props.highlightUuid}
          postAuthorAddress={
            props.postAuthorAddress ?? props.post.authorAddress
          }
          expandAll={props.expandAll}
        />
      </div>
    );
  }

  // ── Full (main post) layout ───────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      style="overflow-anchor: none"
      class={
        props.seamless
          ? "relative bg-surface p-3 md:p-5"
          : "relative bg-surface border border-rim rounded-2xl p-3 md:p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200"
      }
    >
      <Show when={isPinned()}>
        <span
          class="absolute top-3 right-3 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-fg leading-none"
          title={t("post.pinned_indicator")}
        >
          <MdFillPush_pin size={13} />
        </span>
      </Show>
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
              <div
                class="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent-txt
                          shrink-0 flex items-center justify-center text-accent-fg text-sm font-bold ring-1 ring-rim
                          cursor-pointer"
              >
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
            <a
              href={`/chanview?f=&hash=${encodeURIComponent(props.post.authorHash || props.post.authorUrl)}`}
              class="font-semibold text-txt hover:underline"
            >
              {props.post.authorName}
            </a>
            <Show when={props.post.via}>
              <div class="flex items-center gap-1">
                <MdFillShare size={12} class="text-muted shrink-0" />
                <span class="text-xs text-muted">via</span>
                <a
                  href={`/chanview?f=&hash=${encodeURIComponent(props.post.via!.hash || props.post.via!.url)}`}
                  class="text-xs text-muted hover:underline font-medium"
                >
                  {props.post.via!.name}
                </a>
              </div>
            </Show>
          </div>
          <div class="flex items-center gap-1.5">
            <Show when={editedAt()}>
              {(edited) => (
                <MdOutlineEdit
                  size={12}
                  class="text-muted shrink-0"
                  title={`${t("post.edited")}: ${new Date(
                    edited() + "Z",
                  ).toLocaleString(locale())}`}
                />
              )}
            </Show>
            <span
              class="text-sm text-muted"
              title={new Date(props.post.created + "Z").toLocaleString(
                locale(),
              )}
            >
              {formatPostDate(props.post.created, locale())}
            </span>
            <Show when={props.post.location}>
              <span
                class="flex items-center gap-0.5 min-w-0 text-sm text-muted"
                title={props.post.location}
              >
                <span class="opacity-60">·</span>
                <MdOutlineLocation_on size={14} class="shrink-0" />
                <Show
                  when={locationHref()}
                  fallback={
                    <span class="truncate max-w-[12rem]">
                      {props.post.location}
                    </span>
                  }
                >
                  <a
                    href={locationHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="truncate max-w-[12rem] hover:underline"
                  >
                    {props.post.location}
                  </a>
                </Show>
              </span>
            </Show>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-2 shrink-0">
          <Show when={isExpired()}>
            <span
              class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-muted/30 text-muted leading-none"
              title={t("post.expired_title")}
            >
              {t("post.expired_badge")}
            </span>
          </Show>
          <Show when={isExpiring()}>
            <span
              class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 leading-none"
              title={expiresTitle()}
            >
              <MdOutlineTimer size={11} />
              <span>{formatPostDate(props.post.expires!, locale())}</span>
            </span>
          </Show>
          <Show when={isScheduled()}>
            <span
              class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 leading-none"
              title={scheduledTitle()}
            >
              <MdOutlineSchedule size={11} />
              <span>{t("post.scheduled_badge")} · {formatPostDate(props.post.created, locale())}</span>
            </span>
          </Show>
          <Show when={isDirectMessage()}>
            <span
              class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-600 dark:text-violet-400 leading-none"
              title={t("post.dm_title")}
            >
              <BiRegularEnvelope size={11} />
              <span>{t("post.dm_badge")}</span>
            </span>
          </Show>
          <Show when={isUnseen()}>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-fg leading-none">
              {t("post.new_badge")}
            </span>
          </Show>
        </div>
      </div>

      <Show
        when={!isEditing()}
        fallback={
          <InlineEditForm
            body={editBody()}
            onBodyChange={setEditBody}
            title={editTitle()}
            onTitleChange={setEditTitle}
            showTitle={!!props.post.title}
            tab={editTab()}
            onTabChange={setEditTab}
            onSave={saveEdit}
            onCancel={cancelEdit}
            saving={editSaving()}
            error={editError()}
            minHeight="100px"
          />
        }
      >
        {/* Title */}
        <Show when={props.post.title}>
          <div
            class="mt-6 prose prose-sm dark:prose-invert max-w-none
                   [&>*]:font-bold [&>*]:tracking-tight [&>*]:text-lg [&>*]:text-txt"
            innerHTML={DOMPurify.sanitize(props.post.title!)}
            onClick={handleBodyClick}
          />
        </Show>

        {/* Event card */}
        <Show when={eventData()}>
          {(ev) => <EventCard post={props.post} event={ev()} />}
        </Show>

        {/* Poll card */}
        <Show when={props.post.poll}>
          {(poll) => <PollCard uuid={props.post.uuid} poll={poll()} />}
        </Show>

        {/* Body — hidden for pure event/poll posts (body is just BBCode tags) */}
        <Show when={!eventData() && !props.post.poll}>
          <div class="relative mt-4">
            <div
              class="overflow-hidden transition-[max-height] duration-300 ease-in-out"
              style={{
                "max-height":
                  props.seamless || bodyExpanded() || !bodyOverflows()
                    ? "none"
                    : `${BODY_COLLAPSED_MAX_PX}px`,
              }}
            >
              <div
                ref={setBodyRef}
                class="prose-code:break-all prose prose-sm dark:prose-invert max-w-none
                       prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                       prose-blockquote:not-italic prose-blockquote:border-accent
                       prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-sm prose-code:text-txt
                       prose-code:before:content-none prose-code:after:content-none
                       prose-img:rounded-lg prose-img:my-2 break-words text-muted"
                innerHTML={props.post.body}
                onClick={handleBodyClick}
                onMouseUp={handleBodyMouseUp}
              />
            </div>
            <Show when={!props.seamless && bodyOverflows() && !bodyExpanded()}>
              <div
                class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent flex items-end justify-center pb-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setBodyExpanded(true);
                }}
              >
                <button
                  class="flex items-center gap-1 text-xs text-accent hover:text-accent-txt
                         bg-overlay/90 px-2 py-0.5 rounded-full border border-accent/50 transition-colors"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  {t("ui.show_more")}
                </button>
              </div>
            </Show>
          </div>
          <Show when={!props.seamless && bodyOverflows() && bodyExpanded()}>
            <button
              class="flex items-center justify-center gap-1 text-xs text-accent hover:text-accent-txt mt-1 w-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setBodyExpanded(false);
              }}
            >
              <svg
                class="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 15l7-7 7 7"
                />
              </svg>
              {t("ui.show_less")}
            </button>
          </Show>
        </Show>
      </Show>

      <Show when={(props.post.attachments?.length ?? 0) > 0}>
        <AttachmentList attachments={props.post.attachments!} />
      </Show>

      {/* Action bar */}
      <div class="mt-4 pt-3 border-t border-rim flex flex-wrap items-center gap-1">
        {/* ── Like / Dislike / Star / Repeat ── */}
        <Show when={canInteract()}>
          <ActionBtn
            icon={
              props.post.viewerLiked ? (
                <MdFillThumb_up size={17} />
              ) : (
                <MdOutlineThumb_up size={17} />
              )
            }
            count={props.post.likeCount}
            label={t("post.like")}
            onClick={onLike}
            active={props.post.viewerLiked}
            activeClass="text-accent"
          />
          <ActionBtn
            icon={
              props.post.viewerDisliked ? (
                <MdFillThumb_down size={17} />
              ) : (
                <MdOutlineThumb_down size={17} />
              )
            }
            count={props.post.dislikeCount}
            label={t("post.dislike")}
            onClick={onDislike}
            active={props.post.viewerDisliked}
            activeClass="text-accent"
          />
        </Show>
        <Show when={canStar()}>
          <button
            onClick={onStar}
            title={props.post.viewerStarred ? t("post.unstar") : t("post.star")}
            class={`flex items-center px-2 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none hover:bg-overlay
                   ${props.post.viewerStarred ? "text-yellow-500" : "text-muted hover:text-txt"}`}
          >
            <Show
              when={props.post.viewerStarred}
              fallback={<MdFillStar_border size={17} />}
            >
              <MdFillStar size={17} />
            </Show>
          </button>
        </Show>
        <Show when={!isPrivate() && canInteract()}>
        <Show
          when={canReshare()}
          fallback={
            <ActionBtn
              icon={
                props.post.viewerRepeated ? (
                  <MdFillShare size={17} />
                ) : (
                  <MdOutlineShare size={17} />
                )
              }
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
              {props.post.viewerRepeated ? (
                <MdFillShare size={17} />
              ) : (
                <MdOutlineShare size={17} />
              )}
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
        </Show>

        {/* ── Save to folder (after repeat) ── */}
        <Show when={canFolder()}>
          <button
            onClick={toggleFolderPicker}
            title={t("post.save_to_folder")}
            class={`flex items-center px-2 py-1.5 rounded-lg text-sm font-medium
                   transition-colors select-none hover:bg-overlay
                   ${showFolderPicker() || hasFolders() ? "text-accent" : "text-muted hover:text-txt"}`}
          >
            <Show
              when={hasFolders()}
              fallback={<MdFillFolder_open size={17} />}
            >
              <MdFillFolder size={17} />
            </Show>
          </button>
        </Show>

        {/* ── Comments + thread controls group ── */}
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
            <MdFillChat size={15} />
            <span>{totalComments()}</span>
          </button>
        </Show>
        <Show when={showComments() && hasNestedComments(props.post.children)}>
          <button
            onClick={() => setThreaded((v) => !v)}
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title={
              threaded() ? t("post.toggle_flat") : t("post.toggle_threaded")
            }
          >
            <Show when={threaded()} fallback={<MdFillAccount_tree size={17} />}>
              <MdFillFormat_list_bulleted size={17} />
            </Show>
          </button>
          <button
            onClick={handleExpandAll}
            class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title={t("post.expand_all")}
          >
            <MdFillUnfold_more size={17} />
          </button>
        </Show>

        {/* ── Reply (pushes to right; spacer keeps alignment when hidden) ── */}
        <span class="ml-auto" />
        <Show when={canInteract() && props.post.canComment !== false}>
          <button
            onClick={openReply}
            class="flex items-center px-2 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title={t("post.reply")}
          >
            <MdOutlineReply size={17} />
          </button>
        </Show>

        {/* ── More actions dropdown (vertical three dots, after Reply) ── */}
        <div ref={moreDropdownRef} class="relative">
          <button
            onClick={openMoreDropdown}
            title={t("post.more_actions")}
            class={`flex items-center px-1.5 py-1.5 rounded-lg text-sm font-medium
                   transition-colors hover:bg-overlay
                   ${moreDropdownOpen() ? "text-accent" : "text-muted"}`}
          >
            <MdFillMore_vert size={18} />
          </button>
        </div>
      </div>

      <Portal>
        <Show when={moreDropdownOpen() && moreDropdownAnchor()}>
          <div
            ref={moreDropdownPortalRef}
            class="fixed z-[9999] min-w-[11rem] bg-surface border border-rim rounded-lg shadow-lg py-1"
            style={{
              bottom: `${moreDropdownAnchor()!.bottom}px`,
              right: `${moreDropdownAnchor()!.right}px`,
            }}
          >
            <Show when={canFollow()}>
              <button
                onClick={() => {
                  onFollowToggle();
                  setMoreDropdownOpen(false);
                }}
                disabled={followPending()}
                class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left disabled:opacity-50
                       ${following() ? "text-accent" : "text-txt"}`}
              >
                <Show
                  when={following()}
                  fallback={<MdOutlineNotifications_none size={15} />}
                >
                  <MdFillNotifications size={15} />
                </Show>
                <span>
                  {following() ? t("post.unfollow") : t("post.follow")}
                </span>
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
                onClick={() => {
                  toggleStats();
                  setMoreDropdownOpen(false);
                }}
                class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                       ${showStats() ? "text-accent" : "text-txt"}`}
              >
                <MdFillBar_chart size={15} />
                <span>{t("post.statistics")}</span>
              </button>
            </Show>
            <Show when={canViewSource()}>
              <button
                onClick={() => {
                  toggleSource();
                  setMoreDropdownOpen(false);
                }}
                class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                       ${showSource() ? "text-accent" : "text-txt"}`}
              >
                <MdOutlineCode size={15} />
                <span>{t("post.view_source")}</span>
              </button>
            </Show>
            <Show when={!!props.post.permalink}>
              <a
                href={props.post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors"
              >
                <BiRegularLinkExternal size={15} />
                <span>{t("post.original")}</span>
              </a>
            </Show>
            <Show when={isRss()}>
              <button
                onClick={() => {
                  handleRssImport();
                  setMoreDropdownOpen(false);
                }}
                disabled={rssImporting()}
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors text-left disabled:opacity-50"
              >
                <MdOutlineCloud_download
                  size={15}
                  classList={{ "animate-spin": rssImporting() }}
                />
                <span>{t("post.import")}</span>
              </button>
            </Show>
            <Show when={!!props.handlers.onRefresh}>
              <button
                onClick={() => {
                  onRefresh();
                  setMoreDropdownOpen(false);
                }}
                disabled={refreshing()}
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors text-left disabled:opacity-50"
              >
                <MdOutlineRefresh
                  size={15}
                  class={refreshing() ? "animate-spin" : ""}
                />
                <span>{t("post.refresh")}</span>
              </button>
            </Show>
            <Show when={canDeliveryReport()}>
              <button
                onClick={() => {
                  toggleDeliveryReport();
                  setMoreDropdownOpen(false);
                }}
                class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                       ${showDeliveryReport() ? "text-accent" : "text-txt"}`}
              >
                <MdOutlineSend size={15} />
                <span>{t("post.delivery_report")}</span>
              </button>
            </Show>
            <Show when={canPin()}>
              <button
                onClick={onPinClick}
                class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left text-txt"
              >
                <Show when={isPinned()} fallback={<MdOutlinePush_pin size={15} />}>
                  <MdFillPush_pin size={15} />
                </Show>
                <span>{isPinned() ? t("post.unpin") : t("post.pin")}</span>
              </button>
            </Show>
            <Show when={canEdit()}>
              <button
                onClick={startEdit}
                class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left text-txt"
              >
                <MdOutlineEdit size={15} />
                <span>{t("post.edit")}</span>
              </button>
            </Show>
            <Show when={canDelete()}>
              <button
                onClick={onDeleteClick}
                class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay transition-colors text-left
                       ${deleteConfirming() ? "text-red-500" : "text-txt"}`}
              >
                <MdOutlineDelete size={15} />
                <span>
                  {deleteConfirming() ? deleteConfirmLabel() : deleteLabel()}
                </span>
              </button>
            </Show>
          </div>
        </Show>
      </Portal>
      <Portal>
        <Show when={repeatDropdownOpen() && dropdownAnchor()}>
          <div
            ref={repeatDropdownPortalRef}
            class="fixed z-[9999] min-w-[11rem] bg-surface border border-rim rounded-lg shadow-lg py-1"
            style={{
              top: `${dropdownAnchor()!.top}px`,
              left: `${dropdownAnchor()!.left}px`,
            }}
          >
            <div class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt hover:bg-overlay transition-colors">
              <button
                onClick={() => {
                  setRepeatDropdownOpen(false);
                  setReshareOpen(true);
                }}
                class="flex items-center gap-2 flex-1 text-left"
              >
                <BiSolidShareAlt size={15} />
                <span>{t("post.reshare_with_comment")} #{props.post.iid}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyShareEmbed();
                }}
                title={t("post.copy_embed_code")}
                aria-label={t("post.copy_embed_code")}
                class="p-0.5 rounded hover:bg-surface transition-colors text-muted hover:text-txt shrink-0"
              >
                <Show when={shareEmbedCopied()} fallback={<MdOutlineContent_copy size={15} />}>
                  <MdOutlineCheck size={15} class="text-accent" />
                </Show>
              </button>
            </div>
          </div>
        </Show>
      </Portal>

      <Show when={showStats()}>
        <PostStats loading={statsLoading()} data={statsData()} />
      </Show>
      <Show when={showSource()}>
        <PostSource loading={sourceLoading()} data={sourceData()} />
      </Show>
      <Show when={showDeliveryReport()}>
        <DeliveryReport
          loading={deliveryReportLoading()}
          data={deliveryReportData()}
        />
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
          parentUuid={props.post.uuid}
          profileUid={props.post.profileUid!}
          initialBody={replyQuote() || undefined}
          onSubmitted={(body) => {
            props.handlers.onComment(
              props.post.mid,
              body,
              props.post.authorName,
              props.post.authorAvatar,
            );
            setReplyOpen(false);
            setShowComments(true);
          }}
        />
      </Show>
      <Show when={reshareOpen() && props.post.iid && auth()?.uid}>
        <PostComposer
          open={true}
          onClose={() => setReshareOpen(false)}
          profileUid={auth()!.uid}
          initialBody={`\n[share=${props.post.iid}][/share]\n`}
          scopeKey={`post:reshare:${props.post.iid}`}
        />
      </Show>
      <Show when={commentsLoading()}>
        <div class="mt-3 text-sm text-muted animate-pulse">
          {t("post.loading_comments")}
        </div>
      </Show>
      <CommentThread
        comments={visibleComments()}
        show={showComments() && !commentsLoading()}
        handlers={props.handlers}
        highlightUuid={props.highlightUuid}
        postAuthorAddress={props.post.authorAddress}
        expandAll={expandAll()}
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
        <img
          src={props.actor.avatar}
          class="w-5 h-5 rounded-full object-cover shrink-0"
        />
      </Show>
      <span class="max-w-[8rem] truncate">{props.actor.name}</span>
    </a>
  );
}

function PostStats(props: {
  loading: boolean;
  data: {
    likes: StatActor[];
    dislikes: StatActor[];
    repeats: StatActor[];
  } | null;
}) {
  const { t } = useI18n();
  const tabs = () => {
    const d = props.data;
    if (!d) return [];
    return [
      { key: "likes" as const, label: t("post.likes"), count: d.likes.length },
      {
        key: "dislikes" as const,
        label: t("post.dislikes"),
        count: d.dislikes.length,
      },
      {
        key: "repeats" as const,
        label: t("post.repeats"),
        count: d.repeats.length,
      },
    ].filter((tab) => tab.count > 0);
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
          fallback={
            <div class="text-xs text-muted">{t("post.no_activity")}</div>
          }
        >
          <div class="flex border-b border-rim mb-3">
            <For each={tabs()}>
              {(t) => (
                <button
                  onClick={() => setTab(t.key)}
                  class={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px
                    ${
                      tab() === t.key
                        ? "border-accent text-txt"
                        : "border-transparent text-muted hover:text-txt hover:border-rim"
                    }`}
                >
                  {t.label}
                  <span
                    class={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                    ${tab() === t.key ? "bg-accent text-accent-fg" : "bg-overlay text-muted"}`}
                  >
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
          <span>
            id: <span class="text-txt">{typed()!.id}</span>
          </span>
          <span>
            uuid: <span class="text-txt">{typed()!.uuid}</span>
          </span>
          <span>
            {typed()!.cached ? t("post.cached") : t("post.generated")}
          </span>
          <a
            href={typed()!.plink}
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent hover:underline"
          >
            plink
          </a>
          <a
            href={typed()!.llink}
            target="_blank"
            rel="noopener noreferrer"
            class="text-accent hover:underline"
          >
            llink
          </a>
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
          <For each={Array(3)}>
            {() => <div class="h-7 w-20 rounded-lg bg-overlay animate-pulse" />}
          </For>
        </div>
      </Show>
      <Show when={!props.loading}>
        <div class="flex flex-wrap gap-1.5 mb-2">
          <Show
            when={mergedFolders().length > 0}
            fallback={
              <p class="text-xs text-muted mb-2">{t("post.no_folders_yet")}</p>
            }
          >
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
                      "bg-overlay text-muted hover:bg-elevated hover:text-txt":
                        !inFolder(),
                    }}
                    title={
                      inFolder()
                        ? `Remove from "${folder}"`
                        : `Save to "${folder}"`
                    }
                  >
                    <Show
                      when={saving()}
                      fallback={
                        <Show
                          when={inFolder()}
                          fallback={<MdFillFolder_open size={12} />}
                        >
                          <MdFillFolder size={12} class="shrink-0" />
                        </Show>
                      }
                    >
                      <svg
                        class="w-3 h-3 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          class="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="4"
                        />
                        <path
                          class="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                    </Show>
                    <span class="truncate max-w-[100px]">{folder}</span>
                  </button>
                );
              }}
            </For>
          </Show>
          <input
            type="text"
            placeholder={t("post.new_folder_placeholder")}
            value={props.newInput}
            onInput={(e) => props.onSetInput(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && props.onAdd()}
            class="ml-auto flex h-7 text-xs border border-rim rounded-lg bg-surface text-txt
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

interface DeliveryEntry {
  name: string;
  result: string;
  time: string;
}

function DeliveryReport(props: {
  loading: boolean;
  data: DeliveryEntry[] | null;
}) {
  const { t, locale } = useI18n();

  const resultClass = (result: string) => {
    if (result === "posted" || result === "accepted for delivery")
      return "text-green-500";
    if (result === "queued") return "text-yellow-500";
    if (result.includes("denied") || result.includes("not found"))
      return "text-red-500";
    return "text-muted";
  };

  return (
    <div class="mt-3 pt-3 border-t border-rim text-xs">
      <Show when={props.loading}>
        <div class="text-muted animate-pulse">{t("post.loading")}</div>
      </Show>
      <Show when={!props.loading && props.data}>
        <Show
          when={(props.data?.length ?? 0) > 0}
          fallback={<div class="text-muted">{t("post.delivery_no_data")}</div>}
        >
          <table class="w-full">
            <thead>
              <tr class="text-muted border-b border-rim">
                <th class="text-left pb-1.5 font-medium pr-3">Recipient</th>
                <th class="text-left pb-1.5 font-medium pr-3">Status</th>
                <th class="text-left pb-1.5 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              <For each={props.data!}>
                {(entry) => (
                  <tr class="border-b border-rim/40 last:border-0">
                    <td class="py-1.5 pr-3 text-txt max-w-[10rem] truncate">
                      {entry.name}
                    </td>
                    <td
                      class={`py-1.5 pr-3 font-mono ${resultClass(entry.result)}`}
                    >
                      {entry.result}
                    </td>
                    <td class="py-1.5 text-muted whitespace-nowrap">
                      {new Date(entry.time + "Z").toLocaleString(locale())}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
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
