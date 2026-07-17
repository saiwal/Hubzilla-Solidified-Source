import { apiFetch } from "@/shared/lib/fetch";

export type Note = {
  id: number;
  mid: string;
  uuid: string;
  body: string;
  created: string;
  edited: string;
  mimetype: string;
};

export type NotesResponse = {
  data: Note[];
  meta: {
    offset: number;
    limit: number;
    count: number;
    has_more: boolean;
  };
};

export async function fetchNotes(start = 0, limit = 20): Promise<NotesResponse> {
  const res = await apiFetch(`/spa/notes?start=${start}&limit=${limit}`);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? "Failed to fetch notes");
  }
  return res.json() as Promise<NotesResponse>;
}

export async function deleteNote(uuid: string): Promise<void> {
  const res = await apiFetch(`/spa/item/${uuid}/delete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Delete failed");
  }
}
