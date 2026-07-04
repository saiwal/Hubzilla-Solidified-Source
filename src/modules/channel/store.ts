// src/modules/channel/store.ts
import { createSignal } from "solid-js";
import { storageGet, storageSet } from "@/shared/lib/storage";
import { createStreamStore } from "@/shared/stream/store/createStreamStore";
import { fetchChannelPosts } from "./api";
import type { ChannelParams, ChannelStreamResult } from "./api";
import { createActionHandlers } from "@/shared/stream/store/actions-store";
import type { ViewMode } from "@/shared/stream/types";

// ── nick signal (channel-specific) ───────────────────────────────────────────
const [nick, setNick] = createSignal<string>("");
export { nick };

// ── can_post_wall signal ──────────────────────────────────────────────────────
const [canPostWall, setCanPostWall] = createSignal(false);
export { canPostWall };

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

export function resetPosts() { store.reset(); }
export async function loadChannel(nickname: string, params?: ChannelParams) {
  setNick(nickname);
  return store.load(params);
}

// ── actions ───────────────────────────────────────────────────────────────────
export const {
  handleLike, handleDislike, handleRepeat,
  handleStar, handleDelete,
  handleComment, loadComments, handleRefresh,
} = createActionHandlers(store);
