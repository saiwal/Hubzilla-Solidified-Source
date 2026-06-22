import { createSignal } from "solid-js";
import { fetchNotes, deleteNote, type Note } from "./api";
import { toast } from "@/shared/store/toast";

const PAGE_SIZE = 20;

const [notes, setNotes]     = createSignal<Note[]>([]);
const [loading, setLoading] = createSignal(false);
const [hasMore, setHasMore] = createSignal(false);
const [offset, setOffset]   = createSignal(0);

export { notes, loading, hasMore };

export async function loadNotes(reset = false) {
  if (reset) {
    setOffset(0);
    setNotes([]);
  }
  setLoading(true);
  try {
    const res = await fetchNotes(reset ? 0 : offset(), PAGE_SIZE);
    const items = res.data ?? [];
    setNotes(reset ? items : [...notes(), ...items]);
    setHasMore(res.meta?.has_more ?? false);
    setOffset((reset ? 0 : offset()) + items.length);
  } catch (e: any) {
    toast.error(e.message ?? "Failed to load notes");
  } finally {
    setLoading(false);
  }
}

export async function removeNote(mid: string) {
  const prev = notes();
  setNotes(prev.filter((n) => n.mid !== mid));
  try {
    await deleteNote(mid);
  } catch (e: any) {
    setNotes(prev);
    toast.error(e.message ?? "Delete failed");
  }
}
