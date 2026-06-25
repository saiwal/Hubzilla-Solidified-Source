import { apiFetch } from '@/shared/lib/fetch';
export interface Album {
  album:  string;       // display name
  folder: string;       // hash used in URLs
  total:  number;
  url:    string;       // full Hubzilla URL (for reference)
  thumb:  string | null;
}

export interface Photo {
  resource_id: string;
  filename:    string;
  description: string;
  album:       string;
  created:     string;
  src:         string;
  link:        string;
}

// fetchPhotoSummary — recent photos
export async function fetchPhotoSummary(nick: string, start = 0): Promise<Photo[]> {
  const res = await apiFetch(`/api/photos/${nick}?start=${start}`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data as Photo[];
}

// fetchAlbums — album list with thumbs
export async function fetchAlbums(nick: string): Promise<Album[]> {
  const res = await apiFetch(`/api/photos/${nick}/albums`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data as Album[];
}

// createAlbum — POST /api/photos/:nick/albums
export async function createAlbum(nick: string, name: string): Promise<Album> {
  const { getCsrfToken } = await import('@/shared/lib/csrf');
  const token = await getCsrfToken().catch(() => '');
  const res = await fetch(`/api/photos/${nick}/albums`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err?.error as Record<string, unknown>)?.message;
    throw new Error(typeof msg === 'string' ? msg : 'Could not create album');
  }
  const { data } = await res.json();
  return data as Album;
}

// fetchPhotoAlbum — photos in a specific album
export async function fetchPhotoAlbum(
  nick: string,
  albumHash: string,
  start = 0,
): Promise<{ photos: Photo[]; album_name: string }> {
  const res = await apiFetch(`/api/photos/${nick}/album/${albumHash}?start=${start}`);
  if (!res.ok) throw await res.json();
  const { data, meta } = await res.json();
  return { photos: data as Photo[], album_name: meta?.album_name ?? '' };
}


export interface PhotoComment {
  iid:              number;
  mid:              string;
  body:             string;
  created:          string;
  thr_parent?:      string;
  like_count?:      number;
  dislike_count?:   number;
  viewer_liked?:    boolean;
  viewer_disliked?: boolean;
  author: {
    name:  string;
    url:   string;
    photo: string;
  };
}

export interface PhotoDetail {
  resource_id:     string;
  filename:        string;
  description:     string;
  album:           string;
  album_link:      string | null;
  created:         string;
  width:           number;
  height:          number;
  is_nsfw:         boolean;
  is_private:      boolean;
  src:             string;
  src_full:        string;
  prevlink:        string | null;
  nextlink:        string | null;
  like_count:      number;
  dislike_count:   number;
  viewer_liked:    boolean;
  viewer_disliked: boolean;
  item_id:         number | null;
  item_mid:        string | null;
  comments:        PhotoComment[];
}

// ── Fetch ─────────────────────────────────────────────────────────────────────




export async function fetchPhotoImage(nick: string, resourceId: string): Promise<PhotoDetail> {
  const res = await apiFetch(`/api/photos/${nick}/image/${resourceId}`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data as PhotoDetail;
}

export interface PhotoEditResult {
  resource_id: string;
  src: string;
  src_full: string;
}

export async function uploadNewPhoto(
  nick: string,
  blob: Blob,
  album = "",
  folder = "",
): Promise<PhotoEditResult> {
  const { getCsrfToken } = await import("@/shared/lib/csrf");
  const token = await getCsrfToken().catch(() => "");
  const fd = new FormData();
  const filename = blob instanceof File ? blob.name : "photo.jpg";
  fd.append("file", blob, filename);
  if (album) fd.append("album", album);
  if (folder) fd.append("folder", folder);
  const res = await fetch(`/api/photos/${nick}/image/upload`, {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF-Token": token },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (err?.error as Record<string, unknown>)?.message;
    throw new Error(typeof msg === "string" ? msg : "Upload failed");
  }
  const { data } = await res.json();
  return data as PhotoEditResult;
}

export async function deletePhoto(nick: string, resourceId: string): Promise<void> {
  const { getCsrfToken } = await import('@/shared/lib/csrf');
  const token = await getCsrfToken().catch(() => '');
  const res = await fetch(`/api/photos/${nick}/image/${resourceId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String((err?.error as Record<string, unknown>)?.message ?? 'Delete failed'));
  }
}

export async function batchDeletePhotos(nick: string, resourceIds: string[]): Promise<void> {
  const { getCsrfToken } = await import('@/shared/lib/csrf');
  const token = await getCsrfToken().catch(() => '');
  const res = await fetch(`/api/photos/${nick}/images`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({ resource_ids: resourceIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String((err?.error as Record<string, unknown>)?.message ?? 'Delete failed'));
  }
}

export async function deleteAlbum(nick: string, folderHash: string): Promise<void> {
  const { getCsrfToken } = await import('@/shared/lib/csrf');
  const token = await getCsrfToken().catch(() => '');
  const res = await fetch(`/api/photos/${nick}/album/${folderHash}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String((err?.error as Record<string, unknown>)?.message ?? 'Delete failed'));
  }
}

export function uploadPhotoEdit(
  nick: string,
  resourceId: string,
  blob: Blob,
  onProgress?: (pct: number) => void,
): Promise<PhotoEditResult> {
  return new Promise(async (resolve, reject) => {
    const { getCsrfToken } = await import("@/shared/lib/csrf");
    const token = await getCsrfToken().catch(() => "");
    const fd = new FormData();
    fd.append("file", blob, "edited.jpg");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/photos/${nick}/image/${resourceId}/edit`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRF-Token", token);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText).data as PhotoEditResult);
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).error?.message ?? "Upload failed")); }
        catch { reject(new Error("Upload failed")); }
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export interface AclGroup      { id: string; name: string; }
export interface AclConnection { hash: string; name: string; photo: string; }
export interface AclData {
  allow_cid:   string[];
  allow_gid:   string[];
  deny_cid:    string[];
  deny_gid:    string[];
  groups:      AclGroup[];
  connections: AclConnection[];
}

export async function fetchAcl(nick: string, type: 'image' | 'album', datum: string): Promise<AclData> {
  const res = await apiFetch(`/api/photos/${nick}/${type}/${datum}/acl`);
  if (!res.ok) throw await res.json();
  const { data } = await res.json();
  return data as AclData;
}

export async function saveAcl(
  nick: string,
  type: 'image' | 'album',
  datum: string,
  acl: { allow_gid: string[]; allow_cid: string[]; deny_gid: string[]; deny_cid: string[] },
): Promise<void> {
  const { getCsrfToken } = await import('@/shared/lib/csrf');
  const token = await getCsrfToken().catch(() => '');
  const res = await fetch(`/api/photos/${nick}/${type}/${datum}/acl`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify(acl),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String((err?.error as Record<string, unknown>)?.message ?? 'Could not save privacy'));
  }
}

export async function renamePhoto(nick: string, resourceId: string, filename: string): Promise<void> {
  const { getCsrfToken } = await import('@/shared/lib/csrf');
  const token = await getCsrfToken().catch(() => '');
  const res = await fetch(`/api/photos/${nick}/image/${resourceId}/rename`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(String((err?.error as Record<string, unknown>)?.message ?? 'Rename failed'));
  }
}

export async function togglePhotoReaction(itemId: number, verb: 'like' | 'dislike'): Promise<void> {
  const url = `/like/${itemId}?verb=${verb}&conv_mode=&page_mode=client&reload=0`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) throw new Error(`${verb} failed: ${res.status}`);
}

export async function postPhotoComment(params: {
  body:        string;
  parent_iid:  number;
  profile_uid: number;
}): Promise<void> {
  const form = new URLSearchParams();
  form.set('type',        'net-comment');
  form.set('profile_uid', String(params.profile_uid));
  form.set('parent',      String(params.parent_iid));
  form.set('body',        params.body);
  form.set('return',      '');
  form.set('jsreload',    '');
  form.set('preview',     '0');
  form.set('conv_mode',   '');

  const res = await fetch('/item', {
    method:  'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    form.toString(),
  });
  if (!res.ok) throw new Error(`Comment failed: ${res.status}`);
}
