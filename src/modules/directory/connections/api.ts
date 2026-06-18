import { apiFetch } from "@/shared/lib/fetch";

export type ConnectionStatus =
  | "pending"
  | "blocked"
  | "ignored"
  | "hidden"
  | "archived"
  | "not_here";

export type ConnectionOrder =
  | "name"
  | "name_desc"
  | "connected"
  | "connected_desc"
  | "recent";

export type ConnectionFilter =
  | "active"
  | "pending"
  | "blocked"
  | "ignored"
  | "hidden"
  | "archived"
  | "recent"
  | "all";

export interface Connection {
  id: number;
  xchan_hash: string;
  name: string;
  address: string;
  url: string;
  photo: string;
  network: string;
  is_forum: boolean;
  connected: string;
  closeness: number;
  role: string;
  status: ConnectionStatus[];
  pending: boolean;
}

export interface ConnectionsMeta {
  total: number;
  limit: number;
  offset: number;
  filter: ConnectionFilter;
  order: ConnectionOrder;
}

export interface ConnectionsResponse {
  meta: ConnectionsMeta;
  connections: Connection[];
}

export async function fetchConnections(params: {
  filter?: ConnectionFilter;
  search?: string;
  order?: ConnectionOrder;
  start?: number;
  limit?: number;
}): Promise<ConnectionsResponse> {
  const q = new URLSearchParams();
  if (params.filter) q.set("filter", params.filter);
  if (params.search) q.set("search", params.search);
  if (params.order)  q.set("order",  params.order);
  if (params.start)  q.set("start",  String(params.start));
  if (params.limit)  q.set("limit",  String(params.limit));

  const res = await apiFetch(`/api/connections?${q}`);
  if (!res.ok) throw new Error(`connections HTTP ${res.status}`);
  const body = await res.json();
  return { connections: body.data, meta: body.meta };
}

export async function fetchConnectionByAddress(address: string): Promise<Connection | null> {
  const res = await apiFetch(`/api/connections?address=${encodeURIComponent(address)}`);
  if (!res.ok) return null;
  const body = await res.json();
  return body.data as Connection | null;
}

export async function approveConnection(abookId: number): Promise<void> {
  const res = await apiFetch(`/api/connections/${abookId}/approve`, {
    method: "POST",
    body: "{}",
  });
  if (!res.ok) throw new Error(`approve HTTP ${res.status}`);
}

export async function deleteConnection(abookId: number): Promise<void> {
  const res = await apiFetch(`/api/connections/${abookId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete HTTP ${res.status}`);
}

export interface Permcat {
  name: string;
  label: string;
}

export interface PermEntry {
  key: string;
  label: string;
  their: boolean;
  my: boolean;
}

export interface ConnectionPerms {
  incl: string;
  excl: string;
  perms: PermEntry[];
}

export async function fetchPermcats(): Promise<Permcat[]> {
  const res = await apiFetch("/api/connections/permcats");
  if (!res.ok) throw new Error(`permcats HTTP ${res.status}`);
  const body = await res.json();
  return body.data as Permcat[];
}

export async function fetchConnectionPerms(abookId: number): Promise<ConnectionPerms> {
  const res = await apiFetch(`/api/connections/${abookId}/perms`);
  if (!res.ok) throw new Error(`perms HTTP ${res.status}`);
  const body = await res.json();
  return body.data as ConnectionPerms;
}

export async function updateConnection(
  abookId: number,
  fields: {
    role?: string;
    closeness?: number;
    blocked?: boolean;
    ignored?: boolean;
    archived?: boolean;
    hidden?: boolean;
    incl?: string;
    excl?: string;
  },
): Promise<void> {
  const res = await apiFetch(`/api/connections/${abookId}`, {
    method: "POST",
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`update HTTP ${res.status}`);
}
