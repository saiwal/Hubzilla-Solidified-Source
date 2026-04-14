// modules/manage/api.ts

export interface ManagedChannel {
  channel_id: number;
  channel_name: string;
  channel_address: string;
  channel_hash: string;
  is_current: boolean;
  is_default: boolean;
  photo: string;
  url: string;
  intros: number;
  switch_url: string;
  make_default_url: string;
}

export interface ManagedDelegate {
  name: string;
  address: string;
  photo: string;
  url: string;
  switch_url: string;
}

export interface ManageApiResponse {
  channels: ManagedChannel[];
  delegates: ManagedDelegate[];
  current_uid: number;
  total_channels: number;
  limit: number | null;
  create_url: string;
}

export interface SwitchResult {
  status: "ok";
  channel_id: number;
  redirect_to: string;
}

export interface SetDefaultResult {
  status: "ok";
  default_channel_id: number;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchManageApi(): Promise<ManageApiResponse> {
  const res = await fetch("/manage_api?format=json", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`manage_api HTTP ${res.status}`);
  return res.json();
}

export async function switchChannel(channelId: number): Promise<SwitchResult> {
  const res = await fetch("/manage_api?format=json", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ switch_to: channelId }),
  });
  if (!res.ok) throw new Error(`switch channel HTTP ${res.status}`);
  return res.json();
}

export async function setDefaultChannel(
  channelId: number,
): Promise<SetDefaultResult> {
  const res = await fetch("/manage_api?format=json", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ set_default: channelId }),
  });
  if (!res.ok) throw new Error(`set default HTTP ${res.status}`);
  return res.json();
}
