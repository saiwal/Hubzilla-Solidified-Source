// ── Display ──────────────────────────────────────────────────────────────────
export interface DisplaySettings {
  theme: string;
  themes: string[];
  color_scheme: string;
  custom_theme_colors?: string;
  update_interval: number;   // seconds (PHP divides ms by 1000)
  itemspage: number;
  start_menu: number;        // 0 | 1
  font_size: "small" | "medium" | "large" | "xl";
  font_family: "system" | "serif" | "monospace" | "nunito" | "saira" | "share-tech" | "playfair" | "libre-baskerville" | "comfortaa" | "space-mono" | "iosevka" | "righteous" | "playwrite-england" | "comic" | "opendyslexic";
  bg_url: string;
  bg_fit: "tile" | "cover";
  scroll_style: "endless" | "load_more";
  corner_radius: "none" | "sm" | "default" | "lg" | "xl";
}

// ── Privacy ──────────────────────────────────────────────────────────────────
export interface PrivacyPermission {
  key: string;
  label: string;
  value: number;
  help: string;
  options: Record<number, string>;
}

export interface PrivacySettings {
  permission_limits: boolean;
  permiss_arr: [string, string, number, string, Record<number, string>][];
  autoperms: number;
  index_opt_out: number;
  group_actor: number;
  permit_all_mentions: number;
  moderate_unsolicited_comments: number;
  ocap_enabled: number;
}

// ── Account ──────────────────────────────────────────────────────────────────
export interface AccountSettings {
  $email: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface NotificationSettings {
  evdays: number;
  always_show_in_notices: number;
  update_notices_per_parent: number;
  notify1: number; notify2: number; notify3: number; notify4: number;
  notify5: number; notify6: number; notify7: number; notify8: number;
  notify9: number;
  vnotify1: number; vnotify2: number; vnotify3: number; vnotify4: number;
  vnotify5: number; vnotify6: number; vnotify7: number; vnotify8: number;
  vnotify9: number; vnotify10: number; vnotify11?: number; vnotify12: number;
  vnotify13?: number; vnotify14: number; vnotify15: number;
  post_newfriend: number;
  post_joingroup: number;
  post_profilechange: number;
  mailhost: string;
  photo_path: string;
  attach_path: string;
  expire: number;
}
