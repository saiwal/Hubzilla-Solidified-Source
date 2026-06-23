import { createSignal, createMemo, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import { wallAttach, updatePermissions } from "@/modules/files/api";
import type { FileMeta, FileAcl } from "@/modules/files/api";
import type { Photo } from "@/modules/photos/api/api";
import type { Attachment, AttachmentStore } from "./types";
import { storageGet, storageSet, storageDel } from "@/shared/lib/storage";

// ── Serialisable subset saved to IDB ─────────────────────────────────────────
// File objects and blob: URLs are ephemeral and cannot survive a page reload,
// so we strip them when persisting and only restore ready attachments.

type DraftAttachment = {
  id: string;
  source: Attachment["source"];
  filename: string;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  hash?: string;
  resourceId?: string;
  insertUrl?: string;
  thumbUrl?: string;   // only non-blob: URLs
  altText?: string;
  posterUrl?: string;
};

function toSerializable(a: Attachment): DraftAttachment {
  return {
    id: a.id,
    source: a.source,
    filename: a.filename,
    isImage: a.isImage,
    isVideo: a.isVideo,
    isAudio: a.isAudio,
    hash: a.hash,
    resourceId: a.resourceId,
    insertUrl: a.insertUrl,
    thumbUrl: a.thumbUrl?.startsWith("blob:") ? undefined : a.thumbUrl,
    altText: a.altText,
    posterUrl: a.posterUrl?.startsWith("blob:") ? undefined : a.posterUrl,
  };
}

function fromDraft(d: DraftAttachment): Attachment {
  return { ...d, status: "ready", progress: 100 };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const IMAGE_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/gif",
  "image/webp", "image/avif", "image/svg+xml",
]);

function isImageMime(mime: string): boolean {
  return IMAGE_TYPES.has(mime.toLowerCase());
}

function isImageFilename(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(name);
}

function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

function isVideoFilename(name: string): boolean {
  return /\.(mp4|webm|ogv?|mov|avi|mkv|m4v|ts|mts|wmv|flv)$/i.test(name);
}

function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

function isAudioFilename(name: string): boolean {
  return /\.(mp3|ogg|oga|wav|flac|aac|m4a|opus)$/i.test(name);
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Strip host from an absolute URL so [img] tags stay same-origin regardless
// of whether z_root() on the server matches the browser's actual hostname.
function toRelativePath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

// ── Store factory ─────────────────────────────────────────────────────────────

export function createAttachmentStore(nick: string, scope: string): AttachmentStore {
  const DRAFT_KEY = `draft-att:${scope}`;

  const [state, setState] = createStore<{ items: Attachment[] }>({ items: [] });

  let currentAcl: FileAcl | null = null;

  function applyAcl(hash: string) {
    if (!currentAcl) return;
    void updatePermissions(nick, hash, currentAcl).catch(() => {});
  }

  // Guard: don't wipe the IDB key before the async load resolves
  const [draftLoaded, setDraftLoaded] = createSignal(false);

  // Load persisted attachments from IDB on init
  storageGet<DraftAttachment[]>(DRAFT_KEY, []).then((saved) => {
    if (saved.length > 0) setState("items", saved.map(fromDraft));
    setDraftLoaded(true);
  });

  // Persist ready attachments whenever the list changes (after initial load)
  createEffect(() => {
    if (!draftLoaded()) return;
    const data = state.items
      .filter((a) => a.status === "ready")
      .map(toSerializable);
    if (data.length > 0) void storageSet(DRAFT_KEY, data);
    else void storageDel(DRAFT_KEY);
  });

  const attachments = () => state.items;
  const uploading = createMemo(() => state.items.some((a) => a.status === "uploading"));

  function update(id: string, patch: Partial<Attachment>) {
    setState("items", (a) => a.id === id, patch);
  }

  function addUploads(files: FileList | File[]) {
    const arr = Array.from(files);
    const newItems: Attachment[] = arr.map((file) => ({
      id: uid(),
      source: "upload" as const,
      status: "uploading" as const,
      progress: 0,
      filename: file.name,
      isImage: isImageMime(file.type) || isImageFilename(file.name),
      isVideo: isVideoMime(file.type) || isVideoFilename(file.name),
      isAudio: isAudioMime(file.type) || isAudioFilename(file.name),
      thumbUrl: isImageMime(file.type) ? URL.createObjectURL(file) : undefined,
      file,
    }));

    setState("items", (prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      void (async () => {
        try {
          const res = await wallAttach(nick, item.file!, (pct) => update(item.id, { progress: pct }));
          if (res.isPhoto) {
            // Photos: resourceId = attach hash (= photo resource_id); insertUrl for [img] inline embed.
            // Hubzilla's fix_attached_permissions() uses the attach record (flags=1) to update
            // photo permissions to match the post ACL when the post is submitted.
            update(item.id, {
              status: "ready",
              progress: 100,
              resourceId: res.hash,
              insertUrl: res.src ? toRelativePath(res.src) : undefined,
            });
          } else {
            // For video/audio: build a playable /cloud/nick/filename URL.
            // wall_attach places the file at the root of the channel's cloud storage,
            // so /cloud/nick/filename is always reachable. Use server-provided src
            // when available (some Hubzilla versions include [video]url[/video] in
            // the message), otherwise construct it from the filename.
            let insertUrl: string;
            if (item.isVideo || item.isAudio) {
              const path = res.src
                ? toRelativePath(res.src)
                : `/cloud/${nick}/${encodeURIComponent(item.file!.name)}`;
              insertUrl = window.location.origin + path;
            } else {
              insertUrl = `${res.hash},${res.revision}`;
            }
            update(item.id, {
              status: "ready",
              progress: 100,
              hash: res.hash,
              insertUrl,
            });
          }
          applyAcl(res.hash);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          update(item.id, { status: "error", error: msg });
          if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
        }
      })();
    }
  }

  function addCloudFiles(files: FileMeta[]) {
    const newItems: Attachment[] = files.map((f) => ({
      id: uid(),
      source: "cloud-file" as const,
      status: "ready" as const,
      progress: 100,
      filename: f.filename,
      isImage: f.is_photo || isImageFilename(f.filename),
      isVideo: isVideoFilename(f.filename),
      isAudio: isAudioFilename(f.filename),
      hash: f.hash,
      insertUrl: `/cloud/${nick}/${f.display_path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
    }));
    setState("items", (prev) => [...prev, ...dedup(prev, newItems)]);
    for (const item of newItems) {
      if (item.hash) applyAcl(item.hash);
    }
  }

  function addPhotos(photos: Photo[]) {
    const newItems: Attachment[] = photos.map((p) => ({
      id: uid(),
      source: "photo" as const,
      status: "ready" as const,
      progress: 100,
      filename: p.filename,
      isImage: true,
      isVideo: false,
      isAudio: false,
      thumbUrl: p.src,
      insertUrl: toRelativePath(p.src),
      resourceId: p.resource_id,
    }));
    setState("items", (prev) => [...prev, ...dedup(prev, newItems)]);
    for (const item of newItems) {
      if (item.resourceId) applyAcl(item.resourceId);
    }
  }

  function remove(id: string) {
    const item = state.items.find((a) => a.id === id);
    if (item?.source === "upload" && item.thumbUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(item.thumbUrl);
    }
    setState("items", (prev) => prev.filter((a) => a.id !== id));
  }

  function setAltText(id: string, text: string) {
    update(id, { altText: text });
  }

  function insertBBCode(id: string): string {
    const item = state.items.find((a) => a.id === id);
    if (!item || !item.insertUrl) return "";
    if (item.isImage) {
      const alt = item.altText?.trim();
      return alt
        ? `[img alt="${alt}"]${item.insertUrl}[/img]`
        : `[img]${item.insertUrl}[/img]`;
    }
    if (item.isVideo) {
      return item.posterUrl
        ? `[video poster='${item.posterUrl}']${item.insertUrl}[/video]`
        : `[video]${item.insertUrl}[/video]`;
    }
    if (item.isAudio) return `[audio]${item.insertUrl}[/audio]`;
    return `[attachment]${item.insertUrl}[/attachment]`;
  }

  function addVideoWithThumbnail(video: File, thumbnail: File) {
    const id = uid();
    const item: Attachment = {
      id,
      source: "upload",
      status: "uploading",
      progress: 0,
      filename: video.name,
      isImage: false,
      isVideo: true,
      isAudio: false,
      file: video,
    };
    setState("items", (prev) => [...prev, item]);

    void (async () => {
      try {
        // Upload thumbnail first (small file) to get its URL for the poster attribute
        const thumbRes = await wallAttach(nick, thumbnail);
        const posterUrl = thumbRes.isPhoto && thumbRes.src
          ? toRelativePath(thumbRes.src)
          : undefined;
        if (thumbRes.hash) applyAcl(thumbRes.hash);

        // Now upload the video, tracking progress
        const videoRes = await wallAttach(nick, video, (pct) => update(id, { progress: pct }));
        if (videoRes.isPhoto) {
          update(id, {
            status: "ready",
            progress: 100,
            resourceId: videoRes.hash,
            insertUrl: videoRes.src ? toRelativePath(videoRes.src) : undefined,
            posterUrl,
          });
        } else {
          const path = videoRes.src
            ? toRelativePath(videoRes.src)
            : `/cloud/${nick}/${encodeURIComponent(video.name)}`;
          const insertUrl = window.location.origin + path;
          update(id, {
            status: "ready",
            progress: 100,
            hash: videoRes.hash,
            insertUrl,
            posterUrl,
          });
        }
        applyAcl(videoRes.hash);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        update(id, { status: "error", error: msg });
      }
    })();
  }

  function setAcl(acl: FileAcl | null) {
    currentAcl = acl;
    if (!acl) return;
    for (const att of state.items) {
      const hash = att.hash ?? att.resourceId;
      if (att.status === "ready" && hash) applyAcl(hash);
    }
  }

  function clear() {
    state.items.forEach((a) => {
      if (a.source === "upload" && a.thumbUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(a.thumbUrl);
      }
    });
    setState("items", []);
    void storageDel(DRAFT_KEY);
  }

  return { attachments, uploading, addUploads, addVideoWithThumbnail, addCloudFiles, addPhotos, remove, setAltText, insertBBCode, setAcl, clear };
}

// Prevent adding the same hash or resourceId twice
function dedup(existing: readonly Attachment[], incoming: Attachment[]): Attachment[] {
  const hashes = new Set(existing.map((a) => a.hash).filter(Boolean));
  const rids = new Set(existing.map((a) => a.resourceId).filter(Boolean));
  return incoming.filter(
    (a) =>
      !(a.hash && hashes.has(a.hash)) &&
      !(a.resourceId && rids.has(a.resourceId)),
  );
}
