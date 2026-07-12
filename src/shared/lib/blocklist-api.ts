import { apiFetch } from "@/shared/lib/fetch";

export interface BlockedChannel {
  hash: string;
  name: string;
  address: string;
  url: string;
  photo: string;
}

export async function fetchBlockedChannels(): Promise<BlockedChannel[]> {
  const res = await apiFetch("/api/blocklist");
  if (!res.ok) throw new Error(`blocklist HTTP ${res.status}`);
  const body = await res.json();
  return body.data as BlockedChannel[];
}

async function postBlocklistAction(
  action: "block" | "unblock" | "siteblock",
  author: string,
): Promise<{ address: string }> {
  const res = await apiFetch("/api/blocklist", {
    method: "POST",
    body: JSON.stringify({ action, author }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `blocklist ${action} HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data ?? body;
}

export function blockChannel(author: string) {
  return postBlocklistAction("block", author);
}

export function unblockChannel(author: string) {
  return postBlocklistAction("unblock", author);
}

export function blockChannelFromSite(author: string) {
  return postBlocklistAction("siteblock", author);
}
