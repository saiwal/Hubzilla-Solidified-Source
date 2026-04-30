// modules/directory/api/api.ts

export interface DirectoryEntry {
  hash: string;
  name: string;
  address: string;
  photo: string;
  description: string;
  about: string;
  location: string;
  age: number | null;
  gender: string;
  marital: string;
  homepage: string;
  hometown: string;
  keywords: string[];
  public_forum: boolean;
  is_connected: boolean;
  connect_url: string;
  profile_url: string;
  common_count: number | null;
  ignore_url: string | null;
}

export interface DirectoryMeta {
  total: number;
  page: number;
  start: number;
  limit: number;
  globaldir: boolean;
  safe_mode: number;
  suggest: boolean;
  order: string;
}

export interface DirectoryResponse {
  meta: DirectoryMeta;
  entries: DirectoryEntry[];
}

export interface DirectoryParams {
  search?: string;
  keywords?: string;
  order?: "date" | "rdate" | "alphabetic" | "ralpha";
  global?: 0 | 1;
  safe?: number;
  pubforums?: 0 | 1;
  suggest?: 0 | 1;
  start?: number;
}

export async function fetchDirectory(
  params: DirectoryParams = {},
): Promise<DirectoryResponse> {
  const q = new URLSearchParams({ format: "json" });
  if (params.search)    q.set("search",    params.search);
  if (params.keywords)  q.set("keywords",  params.keywords);
  if (params.order)     q.set("order",     params.order);
  if (params.global !== undefined) q.set("global",    String(params.global));
  if (params.safe   !== undefined) q.set("safe",      String(params.safe));
  if (params.pubforums !== undefined) q.set("pubforums", String(params.pubforums));
  if (params.suggest !== undefined)   q.set("suggest",   String(params.suggest));
  if (params.start)     q.set("start",    String(params.start));

  const res = await fetch(`/directory_api?${q}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Directory fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as DirectoryResponse;
}

export async function addConnection(addr: string): Promise<void> {
  await fetch(`/follow/&url=${addr}`, {
    method: "POST",
    credentials: "include",
  });
}
