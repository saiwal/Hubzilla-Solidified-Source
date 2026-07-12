// Client for /api/menus — Hubzilla menus (menu / menu_item tables, the same
// data the stock Menus app and Comanche webpage menus use). Consumed by the
// blocks menu widgets and the webpages menu manager.
//
// Nesting convention: menu items are flat in Hubzilla, so an item whose link
// is "menu:<other-menu-name>" is served by the API as a submenu containing
// that menu's items (recursive, depth-capped, cycle-guarded).

import { apiFetch } from "@/shared/lib/fetch";
import { queryClient } from "@/shared/lib/query-client";

export interface MenuTreeItem {
  label: string;
  /** Absent on submenu container items. */
  url?: string;
  newwin?: boolean;
  items?: MenuTreeItem[];
}

export interface MenuTree {
  name: string;
  desc: string;
  items: MenuTreeItem[];
}

export interface MenuSummary {
  id: number;
  name: string;
  desc: string;
  created: string;
  edited: string;
  item_count: number;
}

export interface RawMenuItem {
  id: number;
  label: string;
  link: string;
  order: number;
  zid: boolean;
  newwin: boolean;
  /** Item carries a non-public ACL (set via the stock Menus app). */
  locked: boolean;
}

export interface RawMenu {
  menu: { id: number; name: string; desc: string };
  items: RawMenuItem[];
}

async function jsonData<T>(res: Response, fallbackMsg: string): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? fallbackMsg);
  return json.data as T;
}

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
  return jsonData<T>(res, "Request failed");
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** Page owner's menu, resolved into a nested tree for the current observer. */
export async function fetchMenuTree(nick: string, name: string): Promise<MenuTree> {
  const res = await apiFetch(`/api/menus/${nick}/${encodeURIComponent(name)}`);
  return jsonData<MenuTree>(res, "Failed to fetch menu");
}

/** Own menus (owner only) — for the widget config panel and the CRUD view. */
export async function fetchMyMenus(): Promise<MenuSummary[]> {
  const res = await apiFetch("/api/menus");
  return (await jsonData<{ menus: MenuSummary[] }>(res, "Failed to fetch menus")).menus;
}

/** One own menu with raw flat items (owner only) — for the CRUD editor. */
export async function fetchRawMenu(id: number): Promise<RawMenu> {
  const res = await apiFetch(`/api/menus/${id}`);
  return jsonData<RawMenu>(res, "Failed to fetch menu");
}

// ── Writes (owner only) ──────────────────────────────────────────────────────

/** Drop every cached read that could show stale menu data. */
function invalidateMenus(): void {
  queryClient.invalidateQueries({ queryKey: ["my-menus"] });
  queryClient.invalidateQueries({ queryKey: ["menu-raw"] });
  queryClient.invalidateQueries({ queryKey: ["menu-tree"] });
}

export async function createMenu(name: string, desc: string): Promise<number> {
  const r = await post<{ id: number }>("/api/menus/create", { name, desc });
  invalidateMenus();
  return r.id;
}

export async function editMenu(id: number, name: string, desc: string): Promise<void> {
  await post(`/api/menus/${id}/edit`, { name, desc });
  invalidateMenus();
}

export async function deleteMenu(id: number): Promise<void> {
  await post(`/api/menus/${id}/delete`, {});
  invalidateMenus();
}

export interface MenuItemInput {
  label: string;
  link: string;
  order: number;
  zid: boolean;
  newwin: boolean;
}

export async function createMenuItem(menuId: number, item: MenuItemInput): Promise<void> {
  await post(`/api/menus/${menuId}/items/create`, item);
  invalidateMenus();
}

export async function editMenuItem(menuId: number, itemId: number, item: MenuItemInput): Promise<void> {
  await post(`/api/menus/${menuId}/items/${itemId}/edit`, item);
  invalidateMenus();
}

export async function deleteMenuItem(menuId: number, itemId: number): Promise<void> {
  await post(`/api/menus/${menuId}/items/${itemId}/delete`, {});
  invalidateMenus();
}
