// src/modules/notify/api.ts
import { apiFetch } from "@/shared/lib/fetch";

export async function resolveNotify(id: string): Promise<{ link: string }> {
  const res = await apiFetch(`/api/notify/${id}`);
  if (!res.ok) throw new Error(`Failed to resolve notification (${res.status})`);
  const json = await res.json();
  return json.data as { link: string };
}
