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
