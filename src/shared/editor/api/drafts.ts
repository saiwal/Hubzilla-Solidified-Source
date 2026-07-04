import { apiFetch } from "@/shared/lib/fetch";
import type { SavedDraft } from "../store/createComposerStore";

export type ServerDraft = SavedDraft & { serverMid: string; scope: string };

export async function listServerDrafts(type = "post"): Promise<ServerDraft[]> {
  try {
    const res = await apiFetch(`/api/drafts?type=${encodeURIComponent(type)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as ServerDraft[];
  } catch {
    return [];
  }
}

export async function saveServerDraft(
  draft: SavedDraft,
  scope: string,
): Promise<string | null> {
  try {
    // mid goes in the body, never in the URL path (full URLs contain slashes)
    const url = draft.serverMid ? "/api/drafts/update" : "/api/drafts";
    const res = await apiFetch(url, {
      method: "POST",
      body: JSON.stringify({
        mid: draft.serverMid ?? null,
        body: draft.body,
        title: draft.title,
        summary: draft.summary,
        mimetype: draft.mimetype,
        slug: draft.slug,
        category: draft.category,
        scope,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data?.mid ?? null) as string | null;
  } catch {
    return null;
  }
}

export async function deleteServerDraft(serverMid: string): Promise<void> {
  try {
    await apiFetch("/api/drafts/delete", {
      method: "POST",
      body: JSON.stringify({ mid: serverMid }),
    });
  } catch {
    // silent
  }
}
