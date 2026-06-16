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
