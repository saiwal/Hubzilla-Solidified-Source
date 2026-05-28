/**
 * Mark a Hubzilla notification as seen.
 * Uses Hubzilla's native /notify/seen/<id> endpoint.
 */
export function markNotifySeen(nid: number): void {
  fetch(`/notify/seen/${nid}`, { redirect: "manual" }).catch(() => {});
}

// Accumulate UUIDs and flush as one batched request after a 1s idle.
const pending = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  if (pending.size === 0) return;
  const uuids = [...pending].join(",");
  pending.clear();
  fetch("/sse_bs", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ sse_rmids: uuids }).toString(),
    credentials: "include",
  }).catch(() => {});
}

/**
 * Mark a stream item as seen via the sse_bs endpoint.
 * Calls are coalesced: UUIDs accumulate for 1 s then sent as one request.
 */
export function markItemSeen(uuid: string): void {
  pending.add(uuid);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 1000);
}
