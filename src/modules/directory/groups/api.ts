// modules/directory/groups/api.ts
import { apiFetch } from "@/shared/lib/fetch";

const BASE = "/spa/privacy-groups";

export interface PrivacyGroup {
  id: number;
  hash: string;
  name: string;
  visible: boolean;
  is_default_acl: boolean;
  is_default_group: boolean;
}

export interface GroupContact {
  xchan_hash: string;
  name: string;
  url: string;
  photo: string;
  addr: string;
  archived: boolean;
}

export interface GroupDetail {
  group: PrivacyGroup;
  members: GroupContact[];
}

export interface ToggleResult {
  action: "added" | "removed";
  members: GroupContact[];
}

export async function fetchGroups(): Promise<PrivacyGroup[]> {
  const res = await apiFetch(BASE);
  if (!res.ok) throw new Error(`Failed to fetch privacy groups: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export async function fetchGroup(id: number): Promise<GroupDetail> {
  const res = await apiFetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch group: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function fetchAvailableContacts(id: number): Promise<GroupContact[]> {
  const res = await apiFetch(`${BASE}/${id}/members`);
  if (!res.ok) throw new Error(`Failed to fetch available contacts: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export async function createGroup(payload: {
  name: string;
  visible: boolean;
}): Promise<PrivacyGroup> {
  const res = await apiFetch(BASE, {
    method: "POST",
    body: JSON.stringify({ name: payload.name, visible: payload.visible ? 1 : 0 }),
  });
  if (!res.ok) throw new Error(`Failed to create group: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function updateGroup(
  id: number,
  payload: {
    name?: string;
    visible?: boolean;
    set_default_acl?: boolean;
    set_default_group?: boolean;
  },
): Promise<PrivacyGroup> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.visible !== undefined) body.visible = payload.visible ? 1 : 0;
  if (payload.set_default_acl !== undefined) body.set_default_acl = payload.set_default_acl;
  if (payload.set_default_group !== undefined) body.set_default_group = payload.set_default_group;

  const res = await apiFetch(`${BASE}/${id}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update group: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function toggleMember(
  groupId: number,
  xchan_hash: string,
): Promise<ToggleResult> {
  const res = await apiFetch(`${BASE}/${groupId}/toggle`, {
    method: "POST",
    body: JSON.stringify({ xchan_hash }),
  });
  if (!res.ok) throw new Error(`Failed to toggle member: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function deleteGroup(id: number): Promise<void> {
  const res = await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete group: ${res.status}`);
}
