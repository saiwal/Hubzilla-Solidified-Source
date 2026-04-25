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

export const apiToggleLike    = (uuid: string) =>
  post<ReactionResult>(`${BASE}/${encodeId(uuid)}/like`);

export const apiToggleDislike = (uuid: string) =>
  post<ReactionResult>(`${BASE}/${encodeId(uuid)}/dislike`);

export const apiToggleRepeat  = (uuid: string) =>
  post<ReactionResult>(`${BASE}/${encodeId(uuid)}/repeat`);

export const apiToggleStar    = (uuid: string) =>
  post<{ success: boolean; starred: boolean }>(`${BASE}/${encodeId(uuid)}/star`);

export const apiCreatePost = (body: Record<string, unknown>) =>
  post<{ success: boolean; iid: number; mid: string; uuid: string }>(BASE, body);

export const apiCreateComment = (parentUuid: string, content: string, title = '') =>
  post<CommentResult>(`${BASE}/${encodeId(parentUuid)}/comment`, { body: content, title });

export const apiEditItem = (uuid: string, content: string, title = '') =>
  post<{ success: boolean }>(`${BASE}/${encodeId(uuid)}/edit`, { body: content, title });

export const apiDeleteItem = (uuid: string) =>
  post<{ success: boolean }>(`${BASE}/${encodeId(uuid)}/delete`);
