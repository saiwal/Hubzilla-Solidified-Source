import { apiFetch } from "@/shared/lib/fetch";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FileAcl {
  allow_gid: string[];
  allow_cid: string[];
  deny_gid:  string[];
  deny_cid:  string[];
}

export interface FileMeta {
  id:           number;
  hash:         string;
  filename:     string;
  filetype:     string;
  filesize:     number;
  folder:       string;  // parent folder hash ('' = root)
  display_path: string;  // path within cloud, e.g. "Documents/report.pdf"
  is_dir:       boolean;
  is_photo:     boolean;
  created:      string;
  edited:       string;
  acl:          FileAcl;
}

// ── Theme API ─────────────────────────────────────────────────────────────────

/** List the contents of a folder by its hash ('' = root). */
export async function listFolder(nick: string, folderHash: string): Promise<FileMeta[]> {
  const url = folderHash
    ? `/api/files/${nick}/folder/${encodeURIComponent(folderHash)}`
    : `/api/files/${nick}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`listFolder ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

/** Update ACL for a file or folder. group_allow / contact_allow are arrays of hashes. */
export async function updatePermissions(
  nick: string,
  hash: string,
  acl: Partial<FileAcl>,
  recurse = false
): Promise<FileMeta> {
  const res = await apiFetch(`/api/files/${nick}/permissions`, {
    method: "POST",
    body: JSON.stringify({
      hash,
      recurse,
      group_allow:   acl.allow_gid ?? [],
      contact_allow: acl.allow_cid ?? [],
      group_deny:    acl.deny_gid  ?? [],
      contact_deny:  acl.deny_cid  ?? [],
    }),
  });
  if (!res.ok) throw new Error(`updatePermissions ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ── wall_upload / wall_attach (post-attachment upload) ────────────────────────

export interface WallUploadResult {
  resource_id: string;
  src: string;   // relative photo URL, e.g. /photo/HASH-1
  body: string;  // original BBCode body from server
}

export interface WallAttachResult {
  hash: string;         // attach table hash (= photo resource_id for images)
  revision: number;     // 0 for photos, actual revision for files
  isPhoto: boolean;
  src?: string;         // media URL: photo from [zmg=URL], video/audio from [video]/[audio] tag
  message: string;      // full BBCode from server
}

function xhrRaw(url: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("userfile", file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    if (onProgress)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    xhr.onload = () => {
      if (xhr.status < 300) resolve(xhr.responseText);
      else reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(fd);
  });
}

/**
 * Upload a photo via wall_upload.
 * Core responds with plain-text BBCode:
 *   \n\n[zrl=.../photos/nick/image/HASH][zmg=URL]filename[/zmg][/zrl]\n\n
 */
export async function wallUpload(
  nick: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<WallUploadResult> {
  const body = (await xhrRaw(`/wall_upload/${encodeURIComponent(nick)}`, file, onProgress)).trim();
  if (!body) throw new Error("Empty response from wall_upload");

  const hashMatch = body.match(/\/image\/([a-f0-9]+)/i);
  if (!hashMatch) throw new Error("Could not parse photo hash from wall_upload response");
  const resource_id = hashMatch[1];

  // Prefer the explicit [zmg=URL] value; fall back to constructing /photo/HASH-1
  const zmgMatch = body.match(/\[zmg=([^\]]+)\]/i);
  const src = zmgMatch ? zmgMatch[1] : `/photo/${resource_id}-1`;

  return { resource_id, src, body };
}

/**
 * Upload any file (image or non-image) via wall_attach.
 *
 * Core always responds with JSON: {"message": "...bbcode..."}
 *
 * For images (is_photo): message = [zrl=.../image/HASH][zmg=URL]filename[/zmg][/zrl]
 *   — hash extracted from /image/HASH, photo URL from [zmg=URL]
 *
 * For files: message = (optional audio/video bbcode)[attachment]hash,revision[/attachment]
 *   — hash and revision extracted from [attachment] tag
 *
 * wall_attach sets flags=1 on the attach record so Hubzilla's item_store()
 * automatically corrects permissions to match the post ACL when the post is submitted.
 * wall_upload does NOT create an attach record, so permissions never get fixed — always use wall_attach.
 */
export async function wallAttach(
  nick: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<WallAttachResult> {
  const text = await xhrRaw(`/wall_attach/${encodeURIComponent(nick)}`, file, onProgress);
  let json: { message?: string };
  try { json = JSON.parse(text); }
  catch { throw new Error("Invalid JSON from wall_attach"); }

  const message = json.message ?? "";
  if (!message) throw new Error("Empty message from wall_attach");

  // Photo response: [zrl=.../photos/nick/image/HASH][zmg=URL]filename[/zmg][/zrl]
  const photoHashMatch = message.match(/\/image\/([a-f0-9]+)/i);
  if (photoHashMatch) {
    const hash = photoHashMatch[1];
    const zmgMatch = message.match(/\[zmg=([^\]]+)\]/i);
    const src = zmgMatch ? zmgMatch[1] : undefined;
    return { hash, revision: 0, isPhoto: true, src, message };
  }

  // File response: [attachment]hash,revision[/attachment]
  // May be preceded by [zvideo]/[video] or [zaudio]/[audio] for media files.
  const attachMatch = message.match(/\[attachment\]([^,\]]+),(\d+)/i);
  if (!attachMatch) throw new Error("Could not parse attachment from wall_attach response");
  const mediaMatch = message.match(/\[z?(?:video|audio)\](.*?)\[\/z?(?:video|audio)\]/i);
  const src = mediaMatch ? mediaMatch[1].trim() : undefined;
  return { hash: attachMatch[1], revision: parseInt(attachMatch[2], 10), isPhoto: false, src, message };
}

// ── WebDAV helpers (upload, delete, mkdir) ────────────────────────────────────

/** Build the WebDAV path for a file/folder from its display_path. */
export function davPath(nick: string, displayPath: string): string {
  const encoded = displayPath.split("/").map(encodeURIComponent).join("/");
  return `/cloud/${nick}/${encoded}`;
}

/** Build the WebDAV directory path for the current folder. */
export function davDirPath(nick: string, folderDisplayPath: string): string {
  return folderDisplayPath
    ? `/cloud/${nick}/${folderDisplayPath.split("/").map(encodeURIComponent).join("/")}/`
    : `/cloud/${nick}/`;
}

export async function uploadFile(
  dirPath: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  const url = dirPath.endsWith("/") ? dirPath : dirPath + "/";
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url + encodeURIComponent(file.name));
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    if (onProgress)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(file);
  });
}

export async function deleteItem(nick: string, displayPath: string): Promise<void> {
  const url  = davPath(nick, displayPath);
  const res  = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!res.ok && res.status !== 204) throw new Error(`Delete ${res.status}`);
}

export async function createFolder(dirPath: string, name: string): Promise<void> {
  const base = dirPath.endsWith("/") ? dirPath : dirPath + "/";
  const res  = await fetch(base + encodeURIComponent(name), {
    method: "MKCOL",
    credentials: "include",
  });
  if (!res.ok && res.status !== 201) throw new Error(`MKCOL ${res.status}`);
}
