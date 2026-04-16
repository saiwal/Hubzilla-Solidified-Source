// shared/lib/nav-api.ts

export interface NavViewer {
  is_local: boolean;
  is_owner: boolean;
  is_admin: boolean;
  nick: string;
  name: string;
  avatar: string;
  url: string;
  uid: number;
	baseurl: string;
}

export interface NavActions {
  logout?: string;
  settings?: string;
  manage?: string;
  profile?: string;
  profiles?: string;
  channel?: string;
	navhome?: string;
  login?: string;
  remote_login?: string;
  register?: string;
}

export interface NavApp {
  name: string;
  label: string;
  /** Primary URL — already stripped of the optional settings URL */
  url: string;
  /** Raw comma-separated URL from Hubzilla (primary[, settings]) */
  url_raw: string;
  /** Settings URL if present, e.g. for Network, Photos */
  settings_url: string;
  /**
   * Bootstrap Icon name extracted from the `photo` field.
   * Hubzilla stores icons as "icon:<bi-name>" (e.g. "icon:house").
   * Falls back to "" when the photo field is a real image URL.
   */
  bi_icon: string;
  /** Raw photo value from Hubzilla — real URL or "icon:*" string */
  photo: string;
  requires: string;
}

export interface NavChannelTab {
  id: string;
  label: string;
  url: string;
  icon: string;
}

export interface NavApiResponse {
  viewer: NavViewer;
  actions: NavActions;
  /** User-ordered pinned apps — these become the primary sidebar nav */
  pinned: NavApp[];
  /** All featured/system apps — these go in the app drawer */
  featured: NavApp[];
  channel_tabs: NavChannelTab[];
  has_public_stream: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the primary URL from a potentially comma-separated Hubzilla app URL.
 * "https://example.com/network, https://example.com/settings/network"
 * → "https://example.com/network"
 */
export function primaryUrl(raw: string): string {
  return raw.split(",")[0].trim();
}

/**
 * Extract the optional settings URL (second segment after comma), or "".
 */
export function settingsUrl(raw: string): string {
  const parts = raw.split(",");
  return parts.length > 1 ? parts[1].trim() : "";
}

/**
 * Parse "icon:<bi-name>" → "<bi-name>", or "" for real image URLs.
 */
export function biIconName(photo: string): string {
  if (photo.startsWith("icon:")) return photo.slice(5);
  return "";
}

/**
 * Normalise a raw Hubzilla app object into the clean NavApp shape.
 */
export function normaliseApp(raw: {
  name: string;
  label: string;
  url: string;
  photo: string;
  requires: string;
}): NavApp {
  return {
    name: raw.name,
    label: raw.label || raw.name,
    url: primaryUrl(raw.url),
    url_raw: raw.url,
    settings_url: settingsUrl(raw.url),
    bi_icon: biIconName(raw.photo),
    photo: raw.photo,
    requires: raw.requires ?? "",
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchNavApi(channelNick?: string): Promise<NavApiResponse> {
  const params = new URLSearchParams({ format: "json" });
  if (channelNick) params.set("channel_nick", channelNick);

  const res = await fetch(`/nav_api?${params}`);
  if (!res.ok) throw new Error(`navapi HTTP ${res.status}`);

  const raw = await res.json();

  // Normalise app arrays
  const pinned: NavApp[]   = (raw.pinned   ?? []).map(normaliseApp);
  const featured: NavApp[] = (raw.featured ?? []).map(normaliseApp);

  return {
    viewer:            raw.viewer,
    actions:           raw.actions ?? {},
    pinned,
    featured,
    channel_tabs:      raw.channel_tabs ?? [],
    has_public_stream: raw.has_public_stream ?? false,
  };
}
