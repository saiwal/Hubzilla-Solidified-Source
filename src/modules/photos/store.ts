import { createSignal } from "solid-js";
import type { Photo, PhotoDetail, PhotoComment } from "./api";
import {
  fetchPhotoSummary,
  fetchPhotoAlbum,
  fetchPhotoImage,
  togglePhotoReaction,
  postPhotoComment,
} from "./api";

// ─── Signals ─────────────────────────────────────────────────────────────────

const [photos, setPhotos]         = createSignal<Photo[]>([]);
const [albumName, setAlbumName]   = createSignal('');
const [detail, setDetail]         = createSignal<PhotoDetail | null>(null);
const [loading, setLoading]       = createSignal(false);
const [nick, setNick]             = createSignal('');

// ─── Loaders ─────────────────────────────────────────────────────────────────

export async function loadSummary(nickname: string, start = 0) {
  setNick(nickname);
  setLoading(true);
  setDetail(null);
  setAlbumName('');
  try {
    const res = await fetchPhotoSummary(nickname, start);
    setPhotos(res.photos);
  } catch (err) {
    console.error('loadSummary failed', err);
  } finally {
    setLoading(false);
  }
}

export async function loadAlbum(nickname: string, albumHash: string, start = 0) {
  setNick(nickname);
  setLoading(true);
  setDetail(null);
  try {
    const res = await fetchPhotoAlbum(nickname, albumHash, start);
    setPhotos(res.photos);
    setAlbumName(res.album_name);
  } catch (err) {
    console.error('loadAlbum failed', err);
  } finally {
    setLoading(false);
  }
}

export async function loadImage(nickname: string, resourceId: string) {
  setNick(nickname);
  setLoading(true);
  try {
    const res = await fetchPhotoImage(nickname, resourceId);
    setDetail(res);
  } catch (err) {
    console.error('loadImage failed', err);
  } finally {
    setLoading(false);
  }
}

// ─── Reaction actions ─────────────────────────────────────────────────────────

export async function handleLike() {
  const d = detail();
  if (!d?.item_id) return;
  const isUndo = d.viewer_liked;
  setDetail({ ...d, viewer_liked: !isUndo, like_count: d.like_count + (isUndo ? -1 : 1) });
  try {
    await togglePhotoReaction(d.item_id, 'like');
  } catch (err) {
    setDetail({ ...d, viewer_liked: isUndo, like_count: d.like_count });
    console.error('Like failed', err);
  }
}

export async function handleDislike() {
  const d = detail();
  if (!d?.item_id) return;
  const isUndo = d.viewer_disliked;
  setDetail({ ...d, viewer_disliked: !isUndo, dislike_count: d.dislike_count + (isUndo ? -1 : 1) });
  try {
    await togglePhotoReaction(d.item_id, 'dislike');
  } catch (err) {
    setDetail({ ...d, viewer_disliked: isUndo, dislike_count: d.dislike_count });
    console.error('Dislike failed', err);
  }
}

export async function handleComment(body: string, profileUid: number) {
  const d = detail();
  if (!d?.item_id || !d.item_mid) return;

  const temp: PhotoComment = {
    id: 0,
    mid: crypto.randomUUID(),
    iid: 0,
    body,
    created: new Date().toISOString().replace('T', ' ').slice(0, 19),
    author: { name: '', url: '', photo: '' },
  };

  setDetail({ ...d, comments: [...d.comments, temp] });

  postPhotoComment({ body, parent_iid: d.item_id, profile_uid: profileUid }).catch(err => {
    console.error('Comment failed', err);
    setDetail(prev => prev
      ? { ...prev, comments: prev.comments.filter(c => c.mid !== temp.mid) }
      : prev
    );
  });
}

export { photos, albumName, detail, loading, nick };
