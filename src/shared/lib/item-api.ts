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

export interface ComposeSource {
  success: boolean;
  body: string;
  title: string;
  summary: string;
  mimetype: string;
}

/** Item source for the edit composer — [share …] blocks collapsed to [share=<id>]. */
export const apiFetchComposeSource = (uuid: string) =>
  apiFetch(`${BASE}/${encodeId(uuid)}/compose`).then(r => r.json()) as Promise<ComposeSource>;

export const apiDeleteItem = (uuid: string) =>
  post<{ success: boolean }>(`${BASE}/${encodeId(uuid)}/delete`);

export const apiFetchItemFolders = (uuid: string): Promise<string[]> =>
  apiFetch(`${BASE}/${encodeId(uuid)}/folders`)
    .then(r => r.json())
    .then(d => Array.isArray(d?.data) ? d.data : []);

export const apiSaveToFolder = (uuid: string, name: string, remove = false): Promise<string[]> =>
  post<{ data: { folders: string[] } }>(`${BASE}/${encodeId(uuid)}/saveto`, { name, remove })
    .then(d => d.data.folders);

export const apiVotePoll = (uuid: string, answer: string | string[]) =>
  post<{ success: boolean }>(`${BASE}/${encodeId(uuid)}/vote`, { answer });

export const apiFollowPost = (uuid: string): Promise<void> =>
  post<{ success?: boolean; error?: string }>(`${BASE}/${encodeId(uuid)}/follow`)
    .then(r => { if (!r.success) throw new Error(r.error || 'Follow failed'); });

export const apiUnfollowPost = (uuid: string): Promise<void> =>
  post<{ success?: boolean; error?: string }>(`${BASE}/${encodeId(uuid)}/unfollow`)
    .then(r => { if (!r.success) throw new Error(r.error || 'Unfollow failed'); });
