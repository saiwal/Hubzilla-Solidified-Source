import { apiFetch } from "@/shared/lib/fetch";
import type {
  AdminSummary, AdminSite, AdminAccount, AdminChannel, AdminSecurity,
  AdminFeatures, AdminAddon, AdminTheme, AdminQueue, WorkerJob,
  ProfileField, DbUpdate, AdminLogs,
} from "./types";

const BASE = "/api/admin";

async function get<T>(section: string, params?: Record<string, string>): Promise<T> {
  const url = params
    ? `${BASE}/${section}?${new URLSearchParams(params)}`
    : `${BASE}/${section}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  const { data } = await res.json();
  return data as T;
}

async function post<T = { status: string }>(section: string, body: unknown): Promise<T> {
  const res = await apiFetch(`${BASE}/${section}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "Request failed");
  }
  const { data } = await res.json();
  return data as T;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export const fetchAdminSummary = () => get<AdminSummary>("summary");

// ── Site ──────────────────────────────────────────────────────────────────────

export const fetchAdminSite = () => get<AdminSite>("site");

export const saveAdminSite = async (data: Partial<AdminSite>): Promise<void> => { await post("site", data); };

// ── Accounts ──────────────────────────────────────────────────────────────────

export interface AccountsPage {
  data: AdminAccount[];
  meta: { offset: number; limit: number; count: number; root_count: number; has_more: boolean };
}

export async function fetchAdminAccounts(page = 0): Promise<AccountsPage> {
  const res = await apiFetch(`${BASE}/accounts?page=${page}`);
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json() as Promise<AccountsPage>;
}

export const adminAccountAction = (account_id: number, action: "block" | "unblock" | "delete") =>
  post("accounts", { account_id, action });

// ── Channels ──────────────────────────────────────────────────────────────────

export interface ChannelsPage {
  data: AdminChannel[];
  meta: { offset: number; limit: number; count: number; root_count: number; has_more: boolean };
}

export async function fetchAdminChannels(page = 0): Promise<ChannelsPage> {
  const res = await apiFetch(`${BASE}/channels?page=${page}`);
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json() as Promise<ChannelsPage>;
}

// ── Security ──────────────────────────────────────────────────────────────────

export const fetchAdminSecurity = () => get<AdminSecurity>("security");

export const saveAdminSecurity = async (data: Partial<AdminSecurity>): Promise<void> => { await post("security", data); };

// ── Features ──────────────────────────────────────────────────────────────────

export const fetchAdminFeatures = () => get<AdminFeatures>("features");

export const saveAdminFeatures = (data: Record<string, boolean>) => post("features", data);

// ── Addons ────────────────────────────────────────────────────────────────────

export async function fetchAdminAddons(): Promise<AdminAddon[]> {
  const r = await get<{ addons: AdminAddon[] }>("addons");
  return r.addons;
}

// ── Themes ────────────────────────────────────────────────────────────────────

export async function fetchAdminThemes(): Promise<{ themes: AdminTheme[]; current: string }> {
  return get("themes");
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export const fetchAdminQueue = () => get<AdminQueue>("inspect-queue");

// ── Queueworker ───────────────────────────────────────────────────────────────

export async function fetchAdminQueueworker(): Promise<WorkerJob[]> {
  const r = await get<{ jobs: WorkerJob[] }>("queueworker");
  return r.jobs;
}

// ── Profile fields ────────────────────────────────────────────────────────────

export async function fetchAdminProfileFields(): Promise<ProfileField[]> {
  const r = await get<{ fields: ProfileField[] }>("profile-fields");
  return r.fields;
}

// ── DB updates ────────────────────────────────────────────────────────────────

export async function fetchAdminDbUpdates(): Promise<DbUpdate[]> {
  const r = await get<{ updates: DbUpdate[] }>("db-updates");
  return r.updates;
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export const fetchAdminLogs = () => get<AdminLogs>("logs");
