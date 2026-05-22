// ── Summary ───────────────────────────────────────────────────────────────────

export interface AdminSummary {
  accounts: {
    total: number;
    blocked: number;
    expired: number;
    expiring: number;
  };
  pending: number;
  channels: number;
  queue: number;
  plugins: string[];
  version: string;
}

// ── Site ──────────────────────────────────────────────────────────────────────

export interface AdminSite {
  sitename: string;
  banner: string;
  admininfo: string;
  siteinfo: string;
  register_policy: number;
  access_policy: number;
  max_daily_registrations: number;
  abandon_days: number;
  login_on_homepage: boolean;
  disable_discover_tab: boolean;
  site_firehose: boolean;
  open_pubstream: boolean;
  language: string;
  theme: string;
  directory_server: string;
  from_email: string;
  from_email_name: string;
  reply_address: string;
  maximagesize: number;
  site_location: string;
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export interface AdminAccount {
  account_id: number;
  account_email: string;
  account_created: string;
  account_lastlog: string;
  account_expires: string;
  account_service_class: string;
  blocked: boolean | number;
  channels: string;
}

// ── Channels ──────────────────────────────────────────────────────────────────

export interface AdminChannel {
  channel_id: number;
  channel_name: string;
  channel_address: string;
  channel_created: string;
  channel_lastpost: string;
}

// ── Security ──────────────────────────────────────────────────────────────────

export interface AdminSecurity {
  block_public: boolean;
  cloud_disable_siteroot: boolean;
  cloud_report_disksize: boolean;
  allowed_email: string;
  not_allowed_email: string;
  whitelisted_sites: string;
  blacklisted_sites: string;
  whitelisted_channels: string;
  blacklisted_channels: string;
  embed_allow: string;
  embed_deny: string;
  embed_sslonly: boolean;
  transport_security_header: boolean;
  content_security_policy: boolean;
  trusted_directory_servers: string;
}

// ── Features ──────────────────────────────────────────────────────────────────

export interface FeatureItem {
  id: string;
  label: string;
  desc: string;
  enabled: boolean;
  locked: boolean;
}

export interface FeatureSection {
  key: string;
  label: string;
  items: FeatureItem[];
}

export interface AdminFeatures {
  sections: FeatureSection[];
}

// ── Addons ────────────────────────────────────────────────────────────────────

export interface AdminAddon {
  name: string;
  description: string;
  version: string;
  author: string;
  installed: boolean;
  active: boolean;
}

// ── Themes ────────────────────────────────────────────────────────────────────

export interface AdminTheme {
  name: string;
  description: string;
  version: string;
  compatible: boolean;
  mobile: boolean;
  experimental: boolean;
  current: boolean;
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export interface QueueItem {
  outq_hash: string;
  outq_created: string;
  outq_updated: string;
  outq_posturl: string;
  outq_delivered: number;
  outq_priority: number;
  outq_channel: number;
}

export interface AdminQueue {
  items: QueueItem[];
  total: number;
}

// ── Queueworker ───────────────────────────────────────────────────────────────

export interface WorkerJob {
  id: number;
  priority: number;
  created: string;
  pid: number;
  argc: number;
  argv: string;
}

// ── Profile fields ────────────────────────────────────────────────────────────

export interface ProfileField {
  id: number;
  [key: string]: unknown;
}

// ── DB updates ────────────────────────────────────────────────────────────────

export interface DbUpdate {
  dbstructure_id: number;
  [key: string]: unknown;
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export type LogLevel =
  | "LOG_EMERG" | "LOG_ALERT" | "LOG_CRIT" | "LOG_ERR"
  | "LOG_WARNING" | "LOG_NOTICE" | "LOG_INFO" | "LOG_DEBUG"
  | "LOG_UNDEFINED";

export interface LogEntry {
  ts: string | null;
  level: LogLevel;
  logid: string | null;
  file: string | null;
  line: number | null;
  fn: string | null;
  message: string;
}

export interface AdminLogs {
  logfile: string | null;
  entries: LogEntry[];
}
