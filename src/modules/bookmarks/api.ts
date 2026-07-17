// src/modules/bookmarks/api.ts
import { apiFetch } from "@/shared/lib/fetch";

export interface BookmarkItem {
  id: number;
  url: string;
  title: string;
  is_chat: boolean;
}

export interface BookmarkMenu {
  id: number;
  name: string;
  items: BookmarkItem[];
}

export async function fetchAllBookmarks(): Promise<BookmarkMenu[]> {
  const res = await apiFetch("/spa/bookmarks");
  if (!res.ok) throw new Error("Failed to fetch bookmarks");
  const json = await res.json();
  return (json.data?.menus ?? []) as BookmarkMenu[];
}

export async function deleteBookmark(mitemId: number): Promise<void> {
  const res = await apiFetch(`/spa/bookmarks/${mitemId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete bookmark");
}
