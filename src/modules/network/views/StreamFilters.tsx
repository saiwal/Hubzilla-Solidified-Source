// src/modules/network/views/StreamFilters.tsx
//
// Compact filter bar + view switcher.
// Mobile: two rows — filters on top, view switcher below.
// Desktop: single row with view switcher at right end.
// Search and connection inputs collapse to icon buttons, expand on click.

import {
  createSignal,
  createEffect,
  on,
  lazy,
  For,
  Show,
} from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { motion } from "solid-motionone";
import { useFloating } from "@/shared/lib/useFloating";
void motion;
import { useSearchParams } from "@solidjs/router";
import { apiFetch } from "@/shared/lib/fetch";
const PostDetailModal = lazy(() => import("@/shared/views/PostDetailModal"));
import { loadNetwork, loading, refreshing, resetPosts, softRefresh, viewMode, changeView } from "../store";
import { ViewSwitcher } from "@/shared/stream/filters";
import {
  MdFillPerson,
  MdFillRefresh,
  MdFillSearch,
  MdFillClose,
  MdFillFormat_list_bulleted,
  MdFillSchedule,
  MdFillForum,
  MdFillBookmark_add,
} from "solid-icons/md";
import { helpable } from "@/shared/lib/helpable";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";
import {
  fetchConnections,
  type AclConnection,
  type NetworkParams,
} from "../api";
import { addSavedSearch } from "../saved-searches";
void helpable;

// ── Constants ─────────────────────────────────────────────────────────────────

type Order = NonNullable<NetworkParams["order"]>;

const ORDER_OPTS: { value: Order; key: string; Icon: any }[] = [
  { value: "created",    key: "latest", Icon: MdFillSchedule },
  { value: "commented",  key: "active", Icon: MdFillForum    },
  { value: "unthreaded", key: "unthreaded", Icon: MdFillFormat_list_bulleted },
];

// Minimum characters before the connection typeahead searches the server —
// avoids polling the full connections/groups list.
const CONN_SEARCH_MIN_CHARS = 3;
const CONN_SEARCH_DEBOUNCE_MS = 250;

// ── Helpers ───────────────────────────────────────────────────────────────────

const str = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const INPUT_CLS =
  "h-8 text-sm border border-rim rounded-lg bg-surface text-txt " +
  "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent " +
  "py-1.5 px-2.5";

// Shared icon-button style
const ICON_BTN =
  "p-1.5 rounded-lg border border-rim bg-surface text-muted " +
  "hover:bg-elevated hover:text-txt transition-colors shrink-0 " +
  "flex items-center justify-center";


const isUrl = (val: string) => val.startsWith("https://");

// ── Component ─────────────────────────────────────────────────────────────────

export default function StreamFilters() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  // Expand state for collapsible inputs
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [connOpen,   setConnOpen]   = createSignal(false);

  // Connection typeahead
  const [connInput, setConnInput]             = createSignal("");
  const [connSuggestOpen, setConnSuggestOpen] = createSignal(false);
  const [debouncedConnQuery, setDebouncedConnQuery] = createSignal("");
  let connDebounceTimer: number | undefined;
  createEffect(on(connInput, (q) => {
    window.clearTimeout(connDebounceTimer);
    const trimmed = q.trim();
    if (trimmed.length < CONN_SEARCH_MIN_CHARS) {
      setDebouncedConnQuery("");
      return;
    }
    connDebounceTimer = window.setTimeout(() => setDebouncedConnQuery(trimmed), CONN_SEARCH_DEBOUNCE_MS);
  }));
  const [connResults] = createQueryResource(
    "acl-stream-search",
    () => debouncedConnQuery() || false,
    (q) => fetchConnections({ search: q, count: 8 }),
  );

  let searchInputRef: HTMLInputElement | undefined;
  let connInputRef:   HTMLInputElement | undefined;
  let suggPanelEl:    HTMLUListElement | undefined;

  const { x: suggX, y: suggY, mount: suggMount, unmount: suggUnmount } =
    useFloating({ placement: "bottom-start", offset: 4 });

  createEffect(() => {
    if (connSuggestOpen() && suggestions().length > 0 && connInputRef && suggPanelEl)
      suggMount(connInputRef, suggPanelEl);
    else
      suggUnmount();
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const order      = (): Order => (str(searchParams.order) as Order) || "created";
  const search     = ()        => str(searchParams.search);
  const tag        = ()        => str(searchParams.tag);
  const file       = ()        => str(searchParams.file);
  const star       = ()        => searchParams.star  === "1";
  const pf         = ()        => searchParams.pf    === "1";
  const conv       = ()        => searchParams.conv  === "1";
  const dm         = ()        => searchParams.dm    === "1";
  const event      = ()        => searchParams.event === "1";
  const dbegin     = ()        => str(searchParams.dbegin);
  const dend       = ()        => str(searchParams.dend);
  const cmin       = ()        => str(searchParams.cmin);
  const cmax       = ()        => str(searchParams.cmax);
  const cid        = ()        => str(searchParams.cid);
  const gid        = ()        => str(searchParams.gid);
  const xchanLabel = ()        => str(searchParams.xchan_label);

  const hasAdvanced   = () => !!(tag() || file() || dbegin() || dend() || cmin() || cmax());
  const hasAnyFilter  = () =>
    order() !== "created" || !!search() || star() || pf() || conv() || dm() || event() ||
    hasAdvanced() || !!(cid() || gid());
  const hasSaveableSearch = () => !!(search() || tag() || xchanLabel());

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sp(overrides: Record<string, string | undefined>) {
    setSearchParams({ ...overrides }, { replace: true });
  }

  function apply() {
    const p: NetworkParams = { order: order() };
    if (search())  p.search = search();
    if (tag())     p.tag    = tag();
    if (file())    p.file   = file();
    if (star())    p.star   = 1;
    if (pf())      p.pf     = 1;
    if (conv())    p.conv   = 1;
    if (dm())      p.dm     = 1;
    if (event())   p.event  = 1;
    if (dbegin())  p.dbegin = dbegin();
    if (dend())    p.dend   = dend();
    if (cmin())    p.cmin   = Number(cmin());
    if (cmax())    p.cmax   = Number(cmax());
    if (cid())     p.cid    = Number(cid());
    if (gid())     p.gid    = Number(gid());
    resetPosts();
    loadNetwork(p);
  }

  function setOrderAndApply(o: Order) {
    sp({ order: o === "created" ? undefined : o });
    setTimeout(apply, 0);
  }

  const [importing, setImporting] = createSignal(false);
  const [importedUuid, setImportedUuid] = createSignal<string | null>(null);

  function captureParams(): Record<string, string> {
    const keys = ["order","search","tag","file","star","pf","conv","dm","event","dbegin","dend","cmin","cmax","cid","gid","xchan_label"];
    const p: Record<string, string> = {};
    for (const k of keys) {
      const v = str(searchParams[k]);
      if (v) p[k] = v;
    }
    return p;
  }

  function autoLabel(): string {
    if (search())      return search();
    if (tag())         return `#${tag()}`;
    if (xchanLabel())  return xchanLabel();
    const parts: string[] = [];
    if (star())  parts.push(t("network.starred"));
    if (pf())    parts.push(t("network.following"));
    if (conv())  parts.push(t("network.conversations"));
    if (dm())    parts.push(t("network.direct_messages"));
    if (event()) parts.push(t("network.events"));
    return parts.join(", ") || t("network.save_search");
  }

  async function saveSearch() {
    await addSavedSearch(autoLabel(), captureParams());
    toast.success(t("network.search_saved"));
  }

  async function handleUrlImport(url: string) {
    setImporting(true);
    try {
      const res = await apiFetch(`/api/search/import?url=${encodeURIComponent(url)}`);
      const body = await res.json();
      if (!res.ok) {
        toast.error(body?.error?.message ?? "Could not fetch post");
        return;
      }
      setImportedUuid(body.data.uuid);
    } catch {
      toast.error("Network error — could not fetch post");
    } finally {
      setImporting(false);
    }
  }

  let searchTimer: ReturnType<typeof setTimeout>;
  function onSearchInput(val: string) {
    sp({ search: val || undefined });
    clearTimeout(searchTimer);
    // Don't trigger stream search for URLs — wait for Enter
    if (!isUrl(val)) {
      searchTimer = setTimeout(apply, 400);
    }
  }

  function clearAll() {
    setSearchParams(
      {
        order: undefined, search: undefined, tag: undefined, file: undefined,
        star: undefined, pf: undefined, conv: undefined, dm: undefined, event: undefined,
        dbegin: undefined, dend: undefined,
        cmin: undefined, cmax: undefined,
        cid: undefined, gid: undefined, xchan_label: undefined,
      },
      { replace: true },
    );
    setConnInput("");
    setSearchOpen(false);
    setConnOpen(false);
    setTimeout(apply, 0);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  function openSearch() {
    setConnOpen(false);
    setSearchOpen(true);
    setTimeout(() => searchInputRef?.focus(), 0);
  }

  function onSearchBlur() {
    if (!search()) setTimeout(() => setSearchOpen(false), 150);
  }

  // ── Connection ────────────────────────────────────────────────────────────

  function openConn() {
    setSearchOpen(false);
    setConnOpen(true);
    setTimeout(() => connInputRef?.focus(), 0);
  }

  const suggestions = () => {
    if (connInput().trim().length < CONN_SEARCH_MIN_CHARS || connResults.loading) return [];
    return connResults() ?? [];
  };

  function selectConnection(c: AclConnection) {
    sp({
      cid:         c.type === "c" ? String(c.id) : undefined,
      gid:         c.type === "g" ? String(c.id) : undefined,
      xchan_label: c.name,
    });
    setConnInput("");
    setConnSuggestOpen(false);
    setConnOpen(false);
    setTimeout(apply, 0);
  }

  function clearConnection() {
    sp({ cid: undefined, gid: undefined, xchan_label: undefined });
    setConnInput("");
    setConnOpen(false);
    setTimeout(apply, 0);
  }

  function onConnBlur() {
    setTimeout(() => {
      setConnSuggestOpen(false);
      if (!cid() && !gid()) setConnOpen(false);
    }, 150);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div class="space-y-1.5 pb-2" use:helpable="network/index.activity-filters">

      {/* Single row: left=refresh+order · center=ViewSwitcher · right=utility icons */}
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-1 min-w-0">

        {/* ── Left: refresh + order ── */}
        <div class="flex items-center gap-1 min-w-0">
          <button
            onClick={softRefresh}
            disabled={loading() || refreshing()}
            title={t("network.refresh")}
            class="p-1.5 rounded-lg hover:bg-elevated transition-colors
                   disabled:opacity-40 text-muted hover:text-txt shrink-0
                   flex items-center justify-center"
          >
            <MdFillRefresh size={17} class={(loading() || refreshing()) ? "animate-spin" : ""} />
          </button>

          <div class="flex rounded-lg border border-rim overflow-hidden shrink-0">
            {ORDER_OPTS.map((opt) => (
              <button
                title={t(`network.${opt.key}` as any)}
                onClick={() => setOrderAndApply(opt.value)}
                class={`flex items-center gap-1 py-1.5 transition-colors
                  px-1.5 sm:px-2.5
                  ${order() === opt.value
                    ? "bg-accent text-accent-fg"
                    : "bg-surface text-muted hover:bg-elevated"
                  }`}
              >
                <opt.Icon size={14} />
                <span class="hidden sm:inline text-xs font-medium">{t(`network.${opt.key}` as any)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Center: view switcher ── */}
        <ViewSwitcher viewMode={viewMode()} onChange={changeView} />

        {/* ── Right: utility icons ── */}
        <div class="flex items-center gap-1 justify-end min-w-0">

          {/* Connection filter */}
          <Show
            when={!!(cid() || gid())}
            fallback={
              <Show
                when={connOpen()}
                fallback={
                  <button onClick={openConn} title={t("network.filter_by_connection")} class={ICON_BTN}>
                    <MdFillPerson size={15} />
                  </button>
                }
              >
                <div class="shrink-0">
                  <input
                    ref={connInputRef}
                    type="text"
                    placeholder={t("network.connection_placeholder")}
                    value={connInput()}
                    onInput={(e) => { setConnInput(e.currentTarget.value); setConnSuggestOpen(true); }}
                    onFocus={() => connInput() && setConnSuggestOpen(true)}
                    onBlur={onConnBlur}
                    class={`${INPUT_CLS} w-28 sm:w-36`}
                  />
                  <Show when={connSuggestOpen() && suggestions().length > 0}>
                    <ul
                      ref={(el) => { suggPanelEl = el; }}
                      use:motion={{
                        initial: { opacity: 0, y: -4 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.12 },
                      }}
                      style={{ position: "fixed", top: `${suggY()}px`, left: `${suggX()}px` }}
                      class="z-50 w-60 max-h-56 overflow-y-auto rounded-lg border border-rim
                             bg-surface shadow-lg py-1"
                    >
                      <For each={suggestions()}>
                        {(c) => (
                          <li>
                            <button
                              onMouseDown={() => selectConnection(c)}
                              class="w-full flex items-center gap-2 px-3 py-1.5
                                     text-sm text-left hover:bg-elevated transition-colors text-txt"
                            >
                              <Show when={c.photo}>
                                <img src={c.photo} alt=""
                                  class="w-6 h-6 rounded-full shrink-0 object-cover bg-elevated" />
                              </Show>
                              <span class="flex flex-col min-w-0">
                                <span class="truncate font-medium text-txt">{c.name}</span>
                                <span class="truncate text-xs text-muted">{c.link || c.nick}</span>
                              </span>
                            </button>
                          </li>
                        )}
                      </For>
                    </ul>
                  </Show>
                </div>
              </Show>
            }
          >
            {/* Active connection chip */}
            <span class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg
                         border border-accent bg-accent-muted text-accent
                         max-w-[110px] sm:max-w-[140px] shrink-0">
              <MdFillPerson size={13} class="shrink-0" />
              <span class="truncate">{xchanLabel() || cid() || gid()}</span>
              <button onClick={clearConnection} title={t("network.remove")}
                class="shrink-0 hover:opacity-70 transition-opacity">
                <MdFillClose size={12} />
              </button>
            </span>
          </Show>

          {/* Search */}
          <Show
            when={searchOpen() || !!search()}
            fallback={
              <button onClick={openSearch} title={t("network.search")} class={ICON_BTN}>
                <MdFillSearch size={15} />
              </button>
            }
          >
            <Show
              when={!importing()}
              fallback={
                <span class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg
                             border border-accent bg-accent-muted text-accent shrink-0">
                  <MdFillRefresh size={13} class="animate-spin shrink-0" />
                  {t("network.fetching_post")}
                </span>
              }
            >
              <div class="relative shrink-0">
                <span class="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  classList={{ "text-green-500": isUrl(search()), "text-muted": !isUrl(search()) }}>
                  <MdFillSearch size={13} />
                </span>
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder={t("network.search_placeholder")}
                  value={search()}
                  onInput={(e) => onSearchInput(e.currentTarget.value)}
                  onBlur={onSearchBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isUrl(search())) {
                      e.preventDefault();
                      handleUrlImport(search());
                    }
                  }}
                  classList={{
                    "border-green-500 focus:ring-green-500": isUrl(search()),
                  }}
                  class={`${INPUT_CLS} w-36 sm:w-48 pl-6 pr-2`}
                />
              </div>
            </Show>
          </Show>

          {/* Save search */}
          <Show when={hasSaveableSearch()}>
            <button onClick={() => void saveSearch()} title={t("network.save_search")} class={ICON_BTN}>
              <MdFillBookmark_add size={15} />
            </button>
          </Show>

          {/* Clear all */}
          <Show when={hasAnyFilter()}>
            <button onClick={clearAll} title={t("network.clear_filters")}
              class="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted
                     hover:text-accent hover:bg-elevated transition-colors shrink-0">
              <MdFillClose size={13} />
              <span class="hidden sm:inline">{t("network.clear_filters")}</span>
            </button>
          </Show>
        </div>
      </div>

      <Show when={importedUuid()}>
        {(uuid) => (
          <PostDetailModal
            uuid={uuid()}
            onClose={() => {
              setImportedUuid(null);
              sp({ search: undefined });
              setSearchOpen(false);
            }}
          />
        )}
      </Show>
    </div>
  );
}
