// modules/directory/groups/store.ts
import { createSignal } from "solid-js";
import type { PrivacyGroup, GroupDetail } from "./api";
import {
  fetchGroups,
  fetchGroup,
  createGroup as apiCreate,
  updateGroup as apiUpdate,
  toggleMember as apiToggle,
  deleteGroup as apiDelete,
} from "./api";

// ── Module-level singleton ────────────────────────────────────────────────────

const [groups, setGroups] = createSignal<PrivacyGroup[]>([]);
const [activeGroup, setActiveGroup] = createSignal<GroupDetail | null>(null);
const [loading, setLoading] = createSignal(false);
const [detailLoading, setDetailLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

export { groups, activeGroup, loading, detailLoading, error };

// ── Actions ───────────────────────────────────────────────────────────────────

export async function loadGroups(force = false): Promise<void> {
  if (groups().length > 0 && !force) return;
  setLoading(true);
  setError(null);
  try {
    setGroups(await fetchGroups());
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setLoading(false);
  }
}

export async function loadGroup(id: number): Promise<void> {
  // Skip if we already have this group loaded
  if (activeGroup()?.group.id === id) return;
  setDetailLoading(true);
  setError(null);
  try {
    setActiveGroup(await fetchGroup(id));
  } catch (e) {
    setError((e as Error).message);
  } finally {
    setDetailLoading(false);
  }
}

export async function createGroup(name: string, visible: boolean): Promise<PrivacyGroup | null> {
  setError(null);
  try {
    const group = await apiCreate({ name, visible });
    setGroups((prev) => [...prev, group]);
    return group;
  } catch (e) {
    setError((e as Error).message);
    return null;
  }
}

export async function updateGroup(
  id: number,
  payload: {
    name?: string;
    visible?: boolean;
    set_default_acl?: boolean;
    set_default_group?: boolean;
  },
): Promise<void> {
  setError(null);
  try {
    const updated = await apiUpdate(id, payload);
    setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
    if (activeGroup()?.group.id === id) {
      setActiveGroup((prev) => (prev ? { ...prev, group: updated } : null));
    }
  } catch (e) {
    setError((e as Error).message);
  }
}

export async function toggleMember(groupId: number, xchan_hash: string): Promise<void> {
  setError(null);
  try {
    const result = await apiToggle(groupId, xchan_hash);
    if (activeGroup()?.group.id === groupId) {
      setActiveGroup((prev) => (prev ? { ...prev, members: result.members } : null));
    }
  } catch (e) {
    setError((e as Error).message);
  }
}

export async function deleteGroup(id: number): Promise<void> {
  setError(null);
  try {
    await apiDelete(id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (activeGroup()?.group.id === id) setActiveGroup(null);
  } catch (e) {
    setError((e as Error).message);
  }
}
