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
  | "connected_desc";

export type ConnectionFilter =
  | "active"
  | "pending"
  | "blocked"
  | "ignored"
  | "hidden"
  | "archived"
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
  const q = new URLSearchParams({ format: "json" });
  if (params.filter) q.set("filter", params.filter);
  if (params.search) q.set("search", params.search);
  if (params.order) q.set("order", params.order);
  if (params.start) q.set("start", String(params.start));
  if (params.limit) q.set("limit", String(params.limit));

  const res = await fetch(`/connections-api?${q}`, { credentials: "include" });
  if (!res.ok) throw new Error(`connections HTTP ${res.status}`);
  return res.json();
}

export async function approveConnection(abookId: number): Promise<void> {
  const fd = new FormData();
  fd.append("abook_id", String(abookId));
  fd.append("approve", "1");
  await fetch(`/connections-api/${abookId}`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
}

export async function deleteConnection(abookId: number): Promise<void> {
  await fetch(`/abook/${abookId}`, {
    method: "DELETE",
    credentials: "include",
  });
}
