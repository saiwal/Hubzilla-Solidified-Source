import { createResource, createSignal, createMemo, createEffect, For, Show, batch } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminLogs, saveLogSettings } from "../../api";
import type { LogEntry, LogLevel } from "../../types";
import { useI18n } from "@/i18n";

const LOG_LEVELS: { label: string; value: number }[] = [
  { label: "Normal",  value: 0 },
  { label: "Trace",   value: 1 },
  { label: "Debug",   value: 2 },
  { label: "Data",    value: 3 },
  { label: "All",     value: 4 },
];

// ── Level metadata ────────────────────────────────────────────────────────────

type Severity = "error" | "warning" | "info" | "debug" | "other";

const LEVEL_META: Record<LogLevel, { severity: Severity; short: string }> = {
  LOG_EMERG:     { severity: "error",   short: "EMERG"   },
  LOG_ALERT:     { severity: "error",   short: "ALERT"   },
  LOG_CRIT:      { severity: "error",   short: "CRIT"    },
  LOG_ERR:       { severity: "error",   short: "ERROR"   },
  LOG_WARNING:   { severity: "warning", short: "WARN"    },
  LOG_NOTICE:    { severity: "info",    short: "NOTICE"  },
  LOG_INFO:      { severity: "info",    short: "INFO"    },
  LOG_DEBUG:     { severity: "debug",   short: "DEBUG"   },
  LOG_UNDEFINED: { severity: "other",   short: "?"       },
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  error:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  info:    "bg-accent-muted text-accent-txt",
  debug:   "bg-elevated text-muted",
  other:   "bg-elevated text-muted",
};

const SEVERITY_ROW: Record<Severity, string> = {
  error:   "border-l-2 border-l-red-400/60",
  warning: "border-l-2 border-l-amber-400/60",
  info:    "",
  debug:   "opacity-70",
  other:   "opacity-60",
};

const FILTER_LEVELS: { label: string; value: Severity | "all" }[] = [
  { label: "All",     value: "all"    },
  { label: "Error",   value: "error"  },
  { label: "Warning", value: "warning"},
  { label: "Info",    value: "info"   },
  { label: "Debug",   value: "debug"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTimestamp(ts: string | null): { short: string; full: string } {
  if (!ts) return { short: "—", full: "unknown" };
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hrs  = Math.floor(mins / 60);

    let short: string;
    if (secs < 60)        short = `${secs}s ago`;
    else if (mins < 60)   short = `${mins}m ago`;
    else if (hrs < 24)    short = `${hrs}h ago`;
    else                  short = d.toLocaleDateString();

    const full = d.toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    return { short, full };
  } catch {
    return { short: ts, full: ts };
  }
}

function getMeta(level: LogLevel) {
  return LEVEL_META[level] ?? LEVEL_META.LOG_UNDEFINED;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LogsSection() {
  const { t } = useI18n();
  const [data, { refetch }] = createResource(fetchAdminLogs);
  const [search, setSearch] = createSignal("");
  const [levelFilter, setLevelFilter] = createSignal<Severity | "all">("all");
  const [expandedIds, setExpandedIds] = createSignal<Set<number>>(new Set());

  // Settings state — seeded from loaded data
  const [debugging, setDebugging] = createSignal(false);
  const [logfile, setLogfile] = createSignal("");
  const [loglevel, setLoglevel] = createSignal(0);
  const [settingsSaving, setSettingsSaving] = createSignal(false);
  const [settingsSaved, setSettingsSaved] = createSignal(false);

  createEffect(() => {
    const d = data();
    if (!d) return;
    setDebugging(d.debugging);
    setLogfile(d.logfile ?? "");
    setLoglevel(d.loglevel);
  });

  async function onSaveSettings() {
    setSettingsSaving(true);
    try {
      await saveLogSettings({ debugging: debugging(), logfile: logfile(), loglevel: loglevel() });
      batch(() => { setSettingsSaving(false); setSettingsSaved(true); });
      setTimeout(() => setSettingsSaved(false), 2000);
      refetch();
    } catch { setSettingsSaving(false); }
  }

  const counts = createMemo(() => {
    const entries = data()?.entries ?? [];
    const c: Record<Severity | "all", number> = { all: entries.length, error: 0, warning: 0, info: 0, debug: 0, other: 0 };
    for (const e of entries) c[getMeta(e.level).severity]++;
    return c;
  });

  const filtered = createMemo(() => {
    const entries = data()?.entries ?? [];
    const q = search().toLowerCase().trim();
    const lf = levelFilter();
    return entries.filter((e) => {
      if (lf !== "all" && getMeta(e.level).severity !== lf) return false;
      if (q) {
        const haystack = `${e.message} ${e.file ?? ""} ${e.fn ?? ""}`.toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  });

  function toggleExpand(idx: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  return (
    <SubPageContent
      title={t("admin.logs_title")}
      description={t("admin.logs_desc")}
      action={
        <button
          onClick={refetch}
          class="px-3 py-1.5 text-xs rounded-lg border border-rim text-txt hover:bg-elevated transition-colors"
        >
          {t("admin.refresh")}
        </button>
      }
    >
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <div class="space-y-4">
            {/* Log settings panel */}
            <div class="rounded-lg border border-rim bg-surface p-4 space-y-3">
              <div class="flex items-center justify-between gap-4 flex-wrap">
                {/* Debugging toggle */}
                <label class="flex items-center gap-3 cursor-pointer select-none">
                  <button
                    role="switch"
                    aria-checked={debugging()}
                    onClick={() => setDebugging((v) => !v)}
                    class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                      ${debugging() ? "bg-accent" : "bg-rim"}`}
                  >
                    <span class={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                      ${debugging() ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <div>
                    <p class="text-sm font-medium text-txt">Debugging</p>
                    <p class="text-xs text-muted">{debugging() ? "Logging enabled" : "Logging disabled"}</p>
                  </div>
                </label>

                {/* Log level */}
                <div class="flex items-center gap-2">
                  <label class="text-xs text-muted whitespace-nowrap">Log level</label>
                  <select
                    value={loglevel()}
                    onChange={(e) => setLoglevel(parseInt(e.currentTarget.value))}
                    disabled={!debugging()}
                    class="px-2 py-1 text-xs rounded border border-rim bg-surface text-txt
                           focus:outline-none focus:border-accent disabled:opacity-50"
                  >
                    <For each={LOG_LEVELS}>
                      {({ label, value }) => <option value={value}>{label}</option>}
                    </For>
                  </select>
                </div>
              </div>

              {/* Logfile path */}
              <div class="flex items-center gap-2">
                <label class="text-xs text-muted whitespace-nowrap shrink-0">Log file</label>
                <input
                  type="text"
                  value={logfile()}
                  onInput={(e) => setLogfile(e.currentTarget.value)}
                  placeholder="e.g. log/hub.log"
                  class="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-rim bg-surface text-txt
                         placeholder:text-muted focus:outline-none focus:border-accent font-mono"
                />
              </div>

              <div class="flex items-center gap-3 justify-end">
                <Show when={settingsSaved()}>
                  <span class="text-xs text-green-600 dark:text-green-400">Saved</span>
                </Show>
                <button
                  onClick={onSaveSettings}
                  disabled={settingsSaving()}
                  class="px-3 py-1.5 text-xs rounded-lg bg-accent text-accent-fg
                         hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {settingsSaving() ? "Saving…" : "Save settings"}
                </button>
              </div>
            </div>

            {/* Level filter pills */}
            <div class="flex items-center gap-1.5 flex-wrap">
              <For each={FILTER_LEVELS}>
                {({ label, value }) => {
                  const cnt = () => counts()[value];
                  const active = () => levelFilter() === value;
                  return (
                    <button
                      onClick={() => setLevelFilter(value)}
                      class={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        active()
                          ? "bg-accent text-accent-fg border-transparent"
                          : "border-rim text-muted hover:bg-elevated"
                      }`}
                    >
                      {label}
                      <span class={`ml-1.5 ${active() ? "opacity-80" : "opacity-60"}`}>
                        {cnt()}
                      </span>
                    </button>
                  );
                }}
              </For>

              {/* Search */}
              <div class="ml-auto">
                <input
                  type="search"
                  placeholder={t("admin.search_messages")}
                  value={search()}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                  class="w-48 px-3 py-1 text-xs rounded-lg border border-rim bg-surface text-txt
                         focus:outline-none focus:border-rim-strong transition-colors"
                />
              </div>
            </div>

            {/* Results info */}
            <Show when={filtered().length !== d().entries.length}>
              <p class="text-xs text-muted">
                {t("admin.show_of")} {filtered().length} {t("admin.of")} {d().entries.length} {t("admin.entries")}
              </p>
            </Show>

            {/* Log entries */}
            <Show
              when={d().logfile}
              fallback={null}
            >
              <Show
                when={filtered().length > 0}
                fallback={
                  <p class="text-sm text-muted py-6 text-center">
                    {d().entries.length === 0 ? t("admin.log_empty") : t("admin.no_filter_match")}
                  </p>
                }
              >
                <div class="rounded-lg border border-rim overflow-hidden divide-y divide-rim">
                  <For each={filtered()}>
                    {(entry, i) => <LogRow entry={entry} idx={i()} expanded={expandedIds().has(i())} onToggle={toggleExpand} />}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow(props: {
  entry: LogEntry;
  idx: number;
  expanded: boolean;
  onToggle: (idx: number) => void;
}) {
  const { t } = useI18n();
  const meta = () => getMeta(props.entry.level);
  const ts   = () => fmtTimestamp(props.entry.ts);
  const isLong = () => props.entry.message.length > 120;

  return (
    <div
      class={`px-3 py-2.5 text-sm bg-surface hover:bg-elevated/50 transition-colors ${SEVERITY_ROW[meta().severity]}`}
    >
      <div class="flex items-start gap-2.5 min-w-0">
        {/* Level badge */}
        <span class={`shrink-0 mt-0.5 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wide ${SEVERITY_CLASSES[meta().severity]}`}>
          {meta().short}
        </span>

        {/* Main content */}
        <div class="flex-1 min-w-0 space-y-0.5">
          {/* Message */}
          <p
            class={`text-txt font-mono text-xs leading-5 ${!props.expanded && isLong() ? "line-clamp-2" : ""}`}
          >
            {props.entry.message}
          </p>
          <Show when={isLong()}>
            <button
              onClick={() => props.onToggle(props.idx)}
              class="text-[10px] text-accent hover:underline"
            >
              {props.expanded ? t("admin.show_less") : t("admin.show_more")}
            </button>
          </Show>

          {/* Meta line */}
          <div class="flex items-center gap-2 flex-wrap">
            <Show when={props.entry.file}>
              <span class="text-[10px] text-muted font-mono">
                {props.entry.file}:{props.entry.line}
              </span>
              <span class="text-[10px] text-muted opacity-40">·</span>
              <span class="text-[10px] text-muted font-mono">{props.entry.fn}()</span>
            </Show>
          </div>
        </div>

        {/* Timestamp */}
        <span
          class="shrink-0 text-[10px] text-muted whitespace-nowrap pt-0.5"
          title={ts().full}
        >
          {ts().short}
        </span>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      <div class="h-4 w-64 rounded bg-elevated" />
      <div class="flex gap-2">
        {Array.from({ length: 5 }, () => (
          <div class="h-6 w-16 rounded-full bg-elevated" />
        ))}
      </div>
      <div class="rounded-lg border border-rim overflow-hidden divide-y divide-rim">
        {Array.from({ length: 8 }, () => (
          <div class="px-3 py-3 bg-surface flex items-start gap-2.5">
            <div class="h-4 w-10 rounded bg-elevated shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3 w-full rounded bg-elevated" />
              <div class="h-3 w-3/4 rounded bg-elevated" />
              <div class="h-2.5 w-32 rounded bg-elevated opacity-60" />
            </div>
            <div class="h-3 w-12 rounded bg-elevated shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
