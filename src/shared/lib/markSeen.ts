/**
 * Mark a Hubzilla notification as seen.
 * Uses Hubzilla's native /notify/seen/<id> endpoint.
 */
export function markNotifySeen(nid: number): void {
  fetch(`/notify/seen/${nid}`, { redirect: "manual" }).catch(() => {});
}

/**
 * Mark a stream/channel item as seen.
 * Calls the json_ep action=seen branch.
 */
// export function markItemSeen(iid: number): void {
//   fetch(`/network?format=json&action=seen&iid=${iid}`).catch(() => {});
// }
export function markItemSeen(uuid: string): void {
  fetch('/sse_bs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sse_rmids: uuid,
    }),
  }).catch(() => {});
}
