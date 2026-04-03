// ── Display ──────────────────────────────────────────────────────────────────
export interface DisplaySettings {
  theme: string;
  themes: string[];
  thread_allow: number;
  update_interval: number;
  itemspage: number;
  no_smilies: number;
  title_tosource: number;
  start_menu: number;
  user_scalable: number;
}

// ── Privacy ───────────────────────────────────────────────────────────────────
export interface PrivacySettings {
  default_post_visibility: "public" | "connections" | "self";
  show_online_status: number; // 0|1 to match Hubzilla int convention
  index_by_search: number;
  show_profile_to_visitors: number;
}

// ── Notifications ─────────────────────────────────────────────────────────────
export interface NotificationSettings {
  email_mentions: number;
  email_connections: number;
  email_digest: number;
  notify_likes: number;
  notify_shares: number;
  notify_comments: number;
}
