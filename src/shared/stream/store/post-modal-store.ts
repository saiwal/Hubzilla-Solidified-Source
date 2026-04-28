// src/shared/stream/store/post-modal-store.ts
import { createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";

const [openPost, setOpenPost] = createSignal<ThreadNode | null>(null);

export const openPostModal  = (post: ThreadNode) => setOpenPost(post);
export const closePostModal = () => setOpenPost(null);
export { openPost };
