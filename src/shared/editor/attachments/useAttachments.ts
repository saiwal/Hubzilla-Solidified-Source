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
  hash?: string;
  resourceId?: string;
  insertUrl?: string;
  thumbUrl?: string;   // only non-blob: URLs
  altText?: string;
};

function toSerializable(a: Attachment): DraftAttachment {
  return {
    id: a.id,
    source: a.source,
    filename: a.filename,
    isImage: a.isImage,
    hash: a.hash,
    resourceId: a.resourceId,
    insertUrl: a.insertUrl,
    thumbUrl: a.thumbUrl?.startsWith("blob:") ? undefined : a.thumbUrl,
    altText: a.altText,
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
            // Files: insertUrl stored as "hash,revision" → insertBBCode produces [attachment]hash,revision[/attachment]
            update(item.id, {
              status: "ready",
              progress: 100,
              hash: res.hash,
              insertUrl: `${res.hash},${res.revision}`,
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
    return `[attachment]${item.insertUrl}[/attachment]`;
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

  return { attachments, uploading, addUploads, addCloudFiles, addPhotos, remove, setAltText, insertBBCode, setAcl, clear };
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
