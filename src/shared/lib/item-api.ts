// src/shared/lib/item-api.ts
import { apiFetch } from './fetch';

const BASE = '/api/item';

function encodeId(uuid: string): string {
  return encodeURIComponent(uuid);
}

// ── GET ───────────────────────────────────────────────────────────────────────

export const fetchItemDetail = (uuid: string) =>
  apiFetch(`${BASE}/${encodeId(uuid)}`).then(r => r.json());

export const fetchComments = (uuid: string, count: number | 'all' = 'all') =>
  apiFetch(`${BASE}/${encodeId(uuid)}/comments/${count}`).then(r => r.json());

export const fetchLikes    = (uuid: string) =>
  apiFetch(`${BASE}/${encodeId(uuid)}/likes`).then(r => r.json());

export const fetchDislikes = (uuid: string) =>
  apiFetch(`${BASE}/${encodeId(uuid)}/dislikes`).then(r => r.json());

export const fetchRepeats  = (uuid: string) =>
  apiFetch(`${BASE}/${encodeId(uuid)}/repeats`).then(r => r.json());

// ── POST ──────────────────────────────────────────────────────────────────────

async function post<T>(url: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface ReactionResult {
  success: boolean;
  state: 'added' | 'removed';
  like_count: number;
  dislike_count: number;
  announce_count: number;
}

export interface CommentResult {
  success: boolean;
  iid: number;
  mid: string;
  uuid: string;
}

export interface RsvpResult {
  success: boolean;
  state: 'added' | 'removed';
  attend_count: number;
  decline_count: number;
  maybe_count: number;
}

export const apiToggleLike    = (uuid: string) =>
  post<ReactionResult>(`${BASE}/${encodeId(uuid)}/like`);

export const apiToggleDislike = (uuid: string) =>
  post<ReactionResult>(`${BASE}/${encodeId(uuid)}/dislike`);

export const apiToggleRepeat  = (uuid: string) =>
  post<ReactionResult>(`${BASE}/${encodeId(uuid)}/repeat`);

export const apiToggleStar = (iid: number): Promise<void> =>
  fetch(`/starred/${iid}`, {
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  }).then(() => undefined);

export const apiRsvpAttend  = (uuid: string) =>
  post<RsvpResult>(`${BASE}/${encodeId(uuid)}/accept`);

export const apiRsvpDecline = (uuid: string) =>
  post<RsvpResult>(`${BASE}/${encodeId(uuid)}/reject`);

export const apiRsvpMaybe   = (uuid: string) =>
  post<RsvpResult>(`${BASE}/${encodeId(uuid)}/tentativeaccept`);

export const apiCreatePost = (body: Record<string, unknown>) =>
  post<{ success: boolean; iid: number; mid: string; uuid: string }>(BASE, body);

export const apiCreateComment = (parentUuid: string, content: string, title = '') =>
  post<CommentResult>(`${BASE}/${encodeId(parentUuid)}/comment`, { body: content, title });

export const apiEditItem = (uuid: string, content: string, title = '') =>
  post<{ success: boolean }>(`${BASE}/${encodeId(uuid)}/edit`, { body: content, title });

export const apiDeleteItem = (uuid: string) =>
  post<{ success: boolean }>(`${BASE}/${encodeId(uuid)}/delete`);

export const apiFetchItemFolders = (uuid: string): Promise<string[]> =>
  apiFetch(`${BASE}/${encodeId(uuid)}/folders`)
    .then(r => r.json())
    .then(d => Array.isArray(d?.data) ? d.data : []);

export const apiSaveToFolder = (uuid: string, name: string, remove = false): Promise<string[]> =>
  post<{ data: { folders: string[] } }>(`${BASE}/${encodeId(uuid)}/saveto`, { name, remove })
    .then(d => d.data.folders);

export const apiFollowPost = (iid: number): Promise<void> =>
  fetch(`/subthread/sub/${iid}`, { credentials: 'include' }).then(() => undefined);

export const apiUnfollowPost = (iid: number): Promise<void> =>
  fetch(`/subthread/unsub/${iid}`, { credentials: 'include' }).then(() => undefined);

export async function postComment(params: {
  body: string;
  parent_iid: number;
  profile_uid: number;
}): Promise<void> {
  const formData = new URLSearchParams();
  formData.set("type", "net-comment");
  formData.set("profile_uid", String(params.profile_uid));
  formData.set("parent", String(params.parent_iid));
  formData.set("body", params.body);
  formData.set("return", "");
  formData.set("jsreload", "");
  formData.set("preview", "0");
  formData.set("conv_mode", "");
  const res = await fetch("/item", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
  if (!res.ok) throw new Error(`Comment failed: ${res.status}`);
}
