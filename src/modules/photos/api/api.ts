import { moduleGet } from "@/shared/api/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Photo {
  id: number;
  resource_id: string;
  filename: string;
  description: string;
  album: string;
  mimetype: string;
  imgscale: number;
  created: string;
  src: string;
  link: string;
}

export interface PhotoComment {
  id: number;
  mid: string;
  iid: number;
  body: string;
  created: string;
  author: {
    name: string;
    url: string;
    photo: string;
  };
}

export interface PhotoDetail {
  type: 'image';
  resource_id: string;
  filename: string;
  description: string;
  album: string;
  album_link: string;
  created: string;
  width: number;
  height: number;
  is_nsfw: number;
  is_private: number;
  src: string;
  src_full: string;
  prevlink: string | null;
  nextlink: string | null;
  like_count: number;
  dislike_count: number;
  viewer_liked: boolean;
  viewer_disliked: boolean;
  item_id: number | null;
  item_mid: string | null;
  comments: PhotoComment[];
}

export interface SummaryResponse {
  type: 'summary';
  photos: Photo[];
}

export interface AlbumResponse {
  type: 'album';
  album_hash: string;
  album_name: string;
  photos: Photo[];
}

// ─── API calls ───────────────────────────────────────────────────────────────

function photosPath(nick: string) {
  return nick ? `photos/${nick}` : 'photos';
}

export async function fetchPhotoSummary(nick: string, start = 0): Promise<SummaryResponse> {
  return moduleGet<SummaryResponse>(`${photosPath(nick)}?format=json&start=${start}`);
}

export async function fetchPhotoAlbum(nick: string, albumHash: string, start = 0): Promise<AlbumResponse> {
  return moduleGet<AlbumResponse>(`${photosPath(nick)}/album/${albumHash}?format=json&start=${start}`);
}

export async function fetchPhotoImage(nick: string, resourceId: string): Promise<PhotoDetail> {
  return moduleGet<PhotoDetail>(`${photosPath(nick)}/image/${resourceId}?format=json`);
}

export async function togglePhotoReaction(itemId: number, verb: 'like' | 'dislike'): Promise<void> {
  const url = `/like/${itemId}?verb=${verb}&conv_mode=&page_mode=client&reload=0`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error(`${verb} failed: ${res.status}`);
}

export async function postPhotoComment(params: {
  body: string;
  parent_iid: number;
  profile_uid: number;
}): Promise<void> {
  const form = new URLSearchParams();
  form.set('type', 'net-comment');
  form.set('profile_uid', String(params.profile_uid));
  form.set('parent', String(params.parent_iid));
  form.set('body', params.body);
  form.set('return', '');
  form.set('jsreload', '');
  form.set('preview', '0');
  form.set('conv_mode', '');

  const res = await fetch('/item', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Comment failed: ${res.status}`);
}
