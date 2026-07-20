// src/modules/channel/store.ts
import { createSignal } from "solid-js";
import { storageGet, storageSet } from "@/shared/lib/storage";
import { createStreamStore } from "@/shared/stream/store/createStreamStore";
import { fetchChannelPosts } from "./api";
import type { ChannelParams, ChannelStreamResult } from "./api";
import { createActionHandlers, findNode } from "@/shared/stream/store/actions-store";
import { apiTogglePin } from "@/shared/lib/item-api";
import { toast } from "@/shared/store/toast";
import type { ViewMode } from "@/shared/stream/types";

// ── nick signal (channel-specific) ───────────────────────────────────────────
const [nick, setNick] = createSignal<string>("");
export { nick };

// ── can_post_wall signal ──────────────────────────────────────────────────────
const [canPostWall, setCanPostWall] = createSignal(false);
export { canPostWall };

const [pinPending, setPinPending] = createSignal(false);
export { pinPending };

// ── fetcher adapter: closes over nick signal ──────────────────────────────────
async function channelFetcher(params: ChannelParams): Promise<ChannelStreamResult> {
  const result = await fetchChannelPosts(nick(), params);
  setCanPostWall(result.canPostWall);
  return result;
}

// ── viewMode ──────────────────────────────────────────────────────────────────
const [viewMode, setViewMode] = createSignal<ViewMode>("masonry");
storageGet<ViewMode>("channel:viewMode", "masonry").then(setViewMode);
export function changeView(v: ViewMode) {
  storageSet("channel:viewMode", v);
  setViewMode(v);
}
export { viewMode };

// ── store instance ────────────────────────────────────────────────────────────
const store = createStreamStore<ChannelParams>(channelFetcher);
export const {
  posts, loading, loadingMore, hasMore, newPosts, profileUid,
  loadMore, flushNewPosts, stopPolling,
} = store;

// Pinned posts are merged into `posts()` as real tree nodes (see api.ts) so
// they get comments/likes/edits/deletes for free — this is just a filtered
// view over the same reactive source, kept in sync automatically.
export function pinnedPosts() {
  return posts().filter((p) => p.pinned);
}

export function resetPosts() { store.reset(); }
export async function loadChannel(nickname: string, params?: ChannelParams) {
  setNick(nickname);
  return store.load(params);
}

// ── actions ───────────────────────────────────────────────────────────────────
export const {
  handleLike, handleDislike, handleRepeat,
  handleStar, handleDelete, handleEdit,
  handleComment, loadComments, handleRefresh,
} = createActionHandlers(store);

// ── pin/unpin — channel-wall-only, refetches page 1 rather than optimistic
// local patching, since it has cross-cutting effects (banner + flags on
// whichever page the post happens to live) that the generic action-handler
// factory has no notion of.
export async function handlePin(mid: string) {
  if (pinPending()) return;
  const node = findNode(posts(), mid);
  if (!node?.uuid) return;

  setPinPending(true);
  try {
    await apiTogglePin(node.uuid);
    await store.load();
  } catch (err) {
    console.error(err);
    toast.error("Failed to update pinned post.");
  } finally {
    setPinPending(false);
  }
}
