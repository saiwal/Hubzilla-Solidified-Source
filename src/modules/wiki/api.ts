// src/modules/wiki/api.ts
import { apiFetch } from "@/shared/lib/fetch";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WikiMeta {
  resource_id: string;
  name: string;
  url_name: string;
  html_name: string;
  mime_type: "text/markdown" | "text/bbcode" | "text/plain";
  type_lock: boolean;
}

export interface WikiPage {
  name: string;
  url_name: string;
}

export interface WikiListResponse {
  wikis: WikiMeta[];
  is_owner: boolean;
  can_create: boolean;
}

export interface WikiPagesResponse {
  wiki: WikiMeta;
  pages: WikiPage[];
  can_write: boolean;
}

export interface WikiPageResponse {
  wiki: WikiMeta;
  page: { name: string; url_name: string; mime_type: string };
  raw: string;
  html: string;
  can_write: boolean;
  commit: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

function wikiUrl(nick: string, ...segments: string[]): string {
  const parts = ["/api/wiki", nick, ...segments].filter(Boolean);
  return parts.join("/");
}

export async function fetchWikis(nick: string): Promise<WikiListResponse> {
  const res = await apiFetch(wikiUrl(nick));
  if (!res.ok) throw new Error(`fetchWikis failed: ${res.status}`);
  const json = await res.json();
  return json.data as WikiListResponse;
}

export async function fetchWikiPages(
  nick: string,
  wikiUrlName: string,
): Promise<WikiPagesResponse> {
  const res = await apiFetch(wikiUrl(nick, wikiUrlName));
  if (!res.ok) throw new Error(`fetchWikiPages failed: ${res.status}`);
  const json = await res.json();
  return json.data as WikiPagesResponse;
}

export async function fetchWikiPage(
  nick: string,
  wikiUrlName: string,
  pageUrlName: string,
): Promise<WikiPageResponse> {
  const res = await apiFetch(wikiUrl(nick, wikiUrlName, pageUrlName));
  if (!res.ok) throw new Error(`fetchWikiPage ${res.status}`);
  const json = await res.json();
  return json.data as WikiPageResponse;
}

export async function createWiki(
  nick: string,
  payload: {
    name: string;
    mime_type?: string;
    type_lock?: boolean;
  },
): Promise<{ success: boolean; resource_id: string; url_name: string }> {
  const res = await apiFetch(wikiUrl(nick), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`createWiki failed: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function savePage(
  nick: string,
  wikiUrlName: string,
  pageUrlName: string,
  payload: { content: string; commit_msg?: string; mime_type?: string },
): Promise<{ success: boolean }> {
  const res = await apiFetch(wikiUrl(nick, wikiUrlName, pageUrlName), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`savePage failed: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function deletePage(
  nick: string,
  wikiUrlName: string,
  pageUrlName: string,
): Promise<{ success: boolean }> {
  const res = await apiFetch(wikiUrl(nick, wikiUrlName, pageUrlName), {
    method: "DELETE",
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`deletePage failed: ${res.status}`);
  const json = await res.json();
  return json.data;
}
