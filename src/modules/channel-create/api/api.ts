import { apiFetch } from "@/shared/lib/fetch";

export interface ChannelRole {
  value: string;
  label: string;
}

export interface FederationProtocol {
  name: string;
  description: string;
  photo: string;
}

export interface IntegrationApp {
  name: string;
  description: string;
  photo: string;
}

export interface NewChannelMeta {
  default_role: string;
  roles: ChannelRole[];
  nickhub: string;
  total_channels: number;
  limit: number | null;
  canadd: boolean;
  protocols: FederationProtocol[];
  integrations: IntegrationApp[];
}

export interface CheckAddrResult {
  suggestion: string;
  available: boolean;
}

export interface CreateChannelPayload {
  name: string;
  nickname: string;
  permissions_role?: string;
  protocols?: string[];
  integrations?: string[];
  color_scheme?: string;
  custom_theme_colors?: string;
  font_size?: string;
  corner_radius?: string;
}

export interface CreateChannelResult {
  channel_id: number;
  nick: string;
  redirect_to: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Request failed");
  return json.data as T;
}

export async function fetchNewChannelMeta(): Promise<NewChannelMeta> {
  return unwrap(await apiFetch("/api/new-channel"));
}

export async function fetchNameSuggestion(name: string): Promise<string> {
  const { suggestion } = await unwrap<{ suggestion: string }>(
    await apiFetch(`/api/new-channel/autofill?name=${encodeURIComponent(name)}`)
  );
  return suggestion;
}

export async function checkNickname(nickname: string, name: string): Promise<CheckAddrResult> {
  const params = new URLSearchParams({ nickname, name });
  return unwrap(await apiFetch(`/api/new-channel/checkaddr?${params.toString()}`));
}

export async function createChannel(payload: CreateChannelPayload): Promise<CreateChannelResult> {
  return unwrap(
    await apiFetch("/api/new-channel", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  );
}
