import { createSignal } from "solid-js";
import type { Photo, PhotoDetail, PhotoComment, Album } from "../api/api";
import {
  fetchPhotoSummary, fetchAlbums,
  fetchPhotoAlbum, fetchPhotoImage,
  togglePhotoReaction, postPhotoComment,
  createAlbum as apiCreateAlbum,
  deletePhoto as apiDeletePhoto,
  batchDeletePhotos as apiBatchDeletePhotos,
  deleteAlbum as apiDeleteAlbum,
  renamePhoto as apiRenamePhoto,
} from "../api/api";

// ─── State ────────────────────────────────────────────────────────────────────

const [photos, setPhotos]         = createSignal<Photo[]>([]);
const [albums, setAlbums]         = createSignal<Album[]>([]);
const [recentPhotos, setRecent]   = createSignal<Photo[]>([]);
const [albumName, setAlbumName]   = createSignal('');
const [detail, setDetail]         = createSignal<PhotoDetail | null>(null);
const [loading, setLoading]       = createSignal(false);
const [albumsLoading, setAlbumsLoading] = createSignal(false);
const [nick, setNick]             = createSignal('');

// ─── Loaders ──────────────────────────────────────────────────────────────────

export async function loadSummary(nickname: string, start = 0) {
  setNick(nickname);
  setLoading(true);
  setDetail(null);
  setAlbumName('');
  try {
    const items = await fetchPhotoSummary(nickname, start);
    setPhotos(items);
  } catch (err) {
    console.error('loadSummary failed', err);
  } finally {
    setLoading(false);
  }
}

export async function loadAlbums(nickname: string) {
  setAlbumsLoading(true);
  try {
    const items = await fetchAlbums(nickname);
    setAlbums(items);
    // Use first photo of each album as recent photos for widget
    const recent = items
      .filter(a => a.thumb)
      .slice(0, 6)
      .map(a => ({ src: a.thumb! } as unknown as Photo));
    setRecent(recent);
  } catch (err) {
    console.error('loadAlbums failed', err);
  } finally {
    setAlbumsLoading(false);
  }
}

export async function loadRecentPhotos(nickname: string) {
  try {
    const items = await fetchPhotoSummary(nickname, 0);
    setRecent(items.slice(0, 8));
  } catch (err) {
    console.error('loadRecentPhotos failed', err);
  }
}

export async function loadAlbum(nickname: string, albumHash: string, start = 0) {
  setNick(nickname);
  setLoading(true);
  setDetail(null);
  try {
    const { photos: items, album_name } = await fetchPhotoAlbum(nickname, albumHash, start);
    setPhotos(items);
    setAlbumName(album_name);
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

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function handleLike() {
  const d = detail();
  if (!d?.item_id) return;
  const isUndo = d.viewer_liked;
  setDetail({ ...d, viewer_liked: !isUndo, like_count: d.like_count + (isUndo ? -1 : 1) });
  try {
    await togglePhotoReaction(d.item_id, 'like');
  } catch {
    setDetail({ ...d });
  }
}

export async function handleDislike() {
  const d = detail();
  if (!d?.item_id) return;
  const isUndo = d.viewer_disliked;
  setDetail({ ...d, viewer_disliked: !isUndo, dislike_count: d.dislike_count + (isUndo ? -1 : 1) });
  try {
    await togglePhotoReaction(d.item_id, 'dislike');
  } catch {
    setDetail({ ...d });
  }
}

export async function handleComment(body: string, profileUid: number) {
  const d = detail();
  if (!d?.item_id || !d.item_mid) return;

  const temp: PhotoComment = {
    iid:     0,
    mid:     crypto.randomUUID(),
    body,
    created: new Date().toISOString().replace('T', ' ').slice(0, 19),
    author:  { name: '', url: '', photo: '' },
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

export function addComment(comment: PhotoComment) {
  setDetail(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : prev);
}

export async function handleCommentReaction(mid: string, verb: 'like' | 'dislike') {
  const d = detail();
  if (!d) return;
  const idx = d.comments.findIndex(c => c.mid === mid);
  if (idx === -1 || !d.comments[idx].iid) return;
  const c = d.comments[idx];
  const isLike = verb === 'like';
  const isUndo = isLike ? (c.viewer_liked ?? false) : (c.viewer_disliked ?? false);
  const updated: PhotoComment = isLike
    ? { ...c, viewer_liked: !isUndo, like_count: (c.like_count ?? 0) + (isUndo ? -1 : 1) }
    : { ...c, viewer_disliked: !isUndo, dislike_count: (c.dislike_count ?? 0) + (isUndo ? -1 : 1) };
  const newComments = [...d.comments];
  newComments[idx] = updated;
  setDetail({ ...d, comments: newComments });
  try {
    await togglePhotoReaction(c.iid, verb);
  } catch {
    setDetail(d);
  }
}

export async function createNewAlbum(nickname: string, name: string): Promise<Album> {
  const album = await apiCreateAlbum(nickname, name);
  setAlbums(prev => [album, ...prev]);
  return album;
}

export function removePhotoLocally(resourceId: string) {
  setPhotos(prev => prev.filter(p => p.resource_id !== resourceId));
}

export async function deletePhotoAction(nick: string, resourceId: string): Promise<void> {
  await apiDeletePhoto(nick, resourceId);
  removePhotoLocally(resourceId);
}

export async function batchDeleteAction(nick: string, resourceIds: string[]): Promise<void> {
  await apiBatchDeletePhotos(nick, resourceIds);
  setPhotos(prev => prev.filter(p => !resourceIds.includes(p.resource_id)));
}

export async function deleteAlbumAction(nick: string, folderHash: string): Promise<void> {
  await apiDeleteAlbum(nick, folderHash);
}

export async function renamePhotoAction(nick: string, resourceId: string, filename: string): Promise<void> {
  await apiRenamePhoto(nick, resourceId, filename);
  setDetail(prev => prev ? { ...prev, filename } : prev);
}

export { photos, albums, recentPhotos, albumName, detail, loading, albumsLoading, nick };
