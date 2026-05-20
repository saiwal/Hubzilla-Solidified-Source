// src/modules/network/store.ts
import { createSignal } from "solid-js";
import { storageGet, storageSet } from "@/shared/lib/storage";
import { createStreamStore } from "@/shared/stream/store/createStreamStore";
import { fetchNetworkStream } from "./api";
import type { NetworkParams } from "./api";
import { createActionHandlers } from "@/shared/stream/store/actions-store";

// ── viewMode ──────────────────────────────────────────────────────────────────
export type ViewMode = "feed" | "masonry" | "list" | "inbox";
const [viewMode, setViewMode] = createSignal<ViewMode>("feed");
storageGet<ViewMode>("network:viewMode", "feed").then(setViewMode);
export function changeView(v: ViewMode) {
  storageSet("network:viewMode", v);
  setViewMode(v);
}
export { viewMode };

// ── store instance ────────────────────────────────────────────────────────────
const store = createStreamStore<NetworkParams>(fetchNetworkStream);
export const {
  posts, loading, loadingMore, hasMore, newPosts, profileUid,
  loadMore, flushNewPosts, stopPolling,
} = store;

export function resetPosts() { store.reset(); }
export function loadNetwork(params?: NetworkParams) { return store.load(params); }

// ── actions ───────────────────────────────────────────────────────────────────
export const {
  handleLike, handleDislike, handleRepeat,
  handleStar, handleDelete,
  handleComment, loadComments,
} = createActionHandlers(store);
