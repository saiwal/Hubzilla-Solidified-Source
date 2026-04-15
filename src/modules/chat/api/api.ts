export interface ChatRoom {
  cr_id: number;
  cr_name: string;
  cr_uid: number;
  cr_expire: number;
  allow_cid: string;
  allow_gid: string;
  deny_cid: string;
  deny_gid: string;
}

export interface ChatMessage {
  chat_room: number;
  chat_xchan: string;
  chat_text: string;
  created: string;
  xchan_name: string;
  xchan_photo_s: string;
}

export interface ChatPresence {
  cp_xchan: string;
  cp_status: string;
  xchan_name: string;
}

export async function fetchRooms(nick: string): Promise<ChatRoom[]> {
  const res = await fetch(`/chat_api/${nick}/rooms?format=json`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.rooms ?? [];
}

export async function fetchRoom(nick: string, roomId: number, since?: string) {
  const url = `/chat_api/${nick}/${roomId}?format=json${since ? `&since=${encodeURIComponent(since)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json() as Promise<{
    room: ChatRoom;
    messages: ChatMessage[];
    presence: ChatPresence[];
  }>;
}

export async function enterRoom(nick: string, roomId: number) {
  await fetch(`/chat_api/${nick}/${roomId}/enter?format=json`);
}

export async function leaveRoom(nick: string, roomId: number) {
  await fetch(`/chat_api/${nick}/${roomId}/leave?format=json`);
}

export async function sendMessage(nick: string, roomId: number, body: string) {
  const fd = new URLSearchParams({ body });
  const res = await fetch(`/chat_api/${nick}/${roomId}/send?format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: fd.toString(),
  });
  return res.ok;
}

export async function createRoom(nick: string, name: string, expire = 120) {
  const fd = new URLSearchParams({ room_name: name, chat_expire: String(expire) });
  const res = await fetch(`/chat_api/${nick}/rooms?format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: fd.toString(),
  });
  const data = await res.json();
  return data.room as ChatRoom | null;
}
