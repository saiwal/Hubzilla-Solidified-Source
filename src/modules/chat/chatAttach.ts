// src/modules/chat/chatAttach.ts
import {
  createFolder,
  uploadFile,
  davDirPath,
  listFolder,
  updatePermissions,
} from "@/modules/files/api";
import type { ChatRoomAcl } from "./api";

export type ChatMediaType = "image" | "video" | "audio" | "file";

export interface ChatMedia {
  url: string;
  filename: string;
  type: ChatMediaType;
  bbcode: string;
}

function getMediaType(file: File): ChatMediaType {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif|svg)$/.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|ogv?|mov|avi|mkv|m4v|wmv)$/.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|ogg|wav|flac|aac|m4a|opus)$/.test(name)) return "audio";
  return "file";
}

function makeBBCode(url: string, type: ChatMediaType, filename: string): string {
  switch (type) {
    case "image": return `[img]${url}[/img]`;
    case "video": return `[zvideo]${url}[/zvideo]`;
    case "audio": return `[zaudio]${url}[/zaudio]`;
    default:      return `[url=${url}]${filename}[/url]`;
  }
}

export function sanitizeFolderName(name: string): string {
  return name.replace(/[^\w\s\-().]/g, "_").trim() || "chat";
}


// Cache: "{nick}:{safeName}" → room folder hash from the attach table
const roomFolderHashCache = new Map<string, string>();

async function getFolderHashes(
  nick: string,
  safeName: string,
): Promise<{ chatHash: string | null; roomHash: string | null }> {
  const cacheKey = `${nick}:${safeName}`;

  const rootItems = await listFolder(nick, "");
  const chatDir = rootItems.find((f) => f.is_dir && f.filename === "chat");
  if (!chatDir) return { chatHash: null, roomHash: null };

  if (roomFolderHashCache.has(cacheKey))
    return { chatHash: chatDir.hash, roomHash: roomFolderHashCache.get(cacheKey)! };

  const chatItems = await listFolder(nick, chatDir.hash);
  const roomDir = chatItems.find((f) => f.is_dir && f.filename === safeName);
  if (roomDir) roomFolderHashCache.set(cacheKey, roomDir.hash);

  return { chatHash: chatDir.hash, roomHash: roomDir?.hash ?? null };
}

export async function uploadChatMedia(
  nick: string,
  roomName: string,
  file: File,
  onProgress?: (pct: number) => void,
  acl?: ChatRoomAcl | null,
): Promise<ChatMedia> {
  const safe = sanitizeFolderName(roomName);

  const now  = new Date();
  const yyyy = String(now.getFullYear());
  const mm   = String(now.getMonth() + 1).padStart(2, "0");
  const dd   = String(now.getDate()).padStart(2, "0");

  const rootDir  = davDirPath(nick, "");
  const chatDir  = davDirPath(nick, "chat");
  const roomDir  = davDirPath(nick, `chat/${safe}`);
  const yearDir  = davDirPath(nick, `chat/${safe}/${yyyy}`);
  const monthDir = davDirPath(nick, `chat/${safe}/${yyyy}/${mm}`);
  const dayDir   = davDirPath(nick, `chat/${safe}/${yyyy}/${mm}/${dd}`);

  // Ensure full date folder hierarchy (MKCOL is idempotent; errors = already exists)
  try { await createFolder(rootDir, "chat"); } catch {}
  try { await createFolder(chatDir, safe); } catch {}
  try { await createFolder(roomDir, yyyy); } catch {}
  try { await createFolder(yearDir, mm); } catch {}
  try { await createFolder(monthDir, dd); } catch {}
  // Invalidate room hash cache after potential folder creation
  roomFolderHashCache.delete(`${nick}:${safe}`);

  await uploadFile(dayDir, file, onProgress);

  const fileUrl = `${window.location.origin}${dayDir}${encodeURIComponent(file.name)}`;
  const type    = getMediaType(file);

  const { chatHash, roomHash } = await getFolderHashes(nick, safe);

  // chat/ parent is always public — WebDAV creates it with the channel's default
  // "friends" ACL, so explicitly clear it every upload.
  if (chatHash) {
    await updatePermissions(nick, chatHash,
      { allow_cid: [], allow_gid: [], deny_cid: [], deny_gid: [] });
  }

  // Apply the room ACL to the room subfolder recursively. For public rooms the
  // arrays are all empty, which explicitly clears the WebDAV-default "Friends"
  // ACL that MKCOL assigns on creation.
  if (acl && roomHash) {
    await updatePermissions(
      nick,
      roomHash,
      { allow_cid: acl.allow_cid, allow_gid: acl.allow_gid,
        deny_cid:  acl.deny_cid,  deny_gid:  acl.deny_gid },
      true,
    );
  }

  return { url: fileUrl, filename: file.name, type, bbcode: makeBBCode(fileUrl, type, file.name) };
}
