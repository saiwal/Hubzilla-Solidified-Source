// src/modules/network/views/StreamFilters.tsx
//
// Compact filter bar + view switcher.
// Mobile: two rows — filters on top, view switcher below.
// Desktop: single row with view switcher at right end.
// Search and connection inputs collapse to icon buttons, expand on click.

import {
  createSignal,
  createResource,
  For,
  Show,
} from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { loadNetwork, loading, resetPosts, viewMode, changeView } from "../store/store";
import {
  MdFillFilter_list,
  MdFillMail,
  MdFillPerson,
  MdFillRefresh,
  MdFillSearch,
  MdFillStar,
  MdFillClose,
  MdFillShort_text,
  MdFillApps,
  MdFillFormat_list_bulleted,
  MdFillAll_inbox,
  MdFillSchedule,
  MdFillForum,
} from "solid-icons/md";
import { helpable } from "@/shared/lib/helpable";
import type { ViewMode } from "@/shared/stream/types";
import {
  fetchConnections,
  type AclConnection,
  type NetworkParams,
} from "../api/api";
void helpable;

// ── Constants ─────────────────────────────────────────────────────────────────

type Order = NonNullable<NetworkParams["order"]>;

const ORDER_OPTIONS: { value: Order; label: string; Icon: any }[] = [
  { value: "created",    label: "Latest", Icon: MdFillSchedule },
  { value: "commented",  label: "Active", Icon: MdFillForum    },
  { value: "unthreaded", label: "All",    Icon: MdFillFormat_list_bulleted },
];

const VIEWS: { id: ViewMode; label: string; Icon: any }[] = [
  { id: "feed",    label: "Feed",  Icon: MdFillShort_text          },
  { id: "masonry", label: "Grid",  Icon: MdFillApps                },
  { id: "list",    label: "List",  Icon: MdFillFormat_list_bulleted },
  { id: "inbox",   label: "Inbox", Icon: MdFillAll_inbox           },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const str = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const INPUT_CLS =
  "text-sm border border-rim rounded-lg bg-surface text-txt " +
  "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent " +
  "py-1.5 px-2.5";

// Shared icon-button style
const ICON_BTN =
  "p-1.5 rounded-lg border border-rim bg-surface text-muted " +
  "hover:bg-elevated hover:text-txt transition-colors shrink-0 " +
  "flex items-center justify-center";

const ICON_BTN_ACTIVE =
  "p-1.5 rounded-lg border border-accent bg-accent-muted text-accent " +
  "transition-colors shrink-0 flex items-center justify-center";

// ── Component ─────────────────────────────────────────────────────────────────

export default function StreamFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Expand state for collapsible inputs
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [connOpen,   setConnOpen]   = createSignal(false);
  const [advOpen,    setAdvOpen]    = createSignal(false);

  // Connection typeahead
  const [connInput, setConnInput]             = createSignal("");
  const [connSuggestOpen, setConnSuggestOpen] = createSignal(false);
  const [connections] = createResource(fetchConnections);

  let searchInputRef: HTMLInputElement | undefined;
  let connInputRef:   HTMLInputElement | undefined;

  // ── Derived ───────────────────────────────────────────────────────────────

  const order      = (): Order => (str(searchParams.order) as Order) || "created";
  const search     = ()        => str(searchParams.search);
  const tag        = ()        => str(searchParams.tag);
  const star       = ()        => searchParams.star  === "1";
  const conv       = ()        => searchParams.conv  === "1";
  const dm         = ()        => searchParams.dm    === "1";
  const dbegin     = ()        => str(searchParams.dbegin);
  const dend       = ()        => str(searchParams.dend);
  const cmin       = ()        => str(searchParams.cmin);
  const cmax       = ()        => str(searchParams.cmax);
  const cid        = ()        => str(searchParams.cid);
  const gid        = ()        => str(searchParams.gid);
  const xchanLabel = ()        => str(searchParams.xchan_label);

  const hasAdvanced  = () => !!(tag() || dbegin() || dend() || cmin() || cmax());
  const hasAnyFilter = () =>
    order() !== "created" || !!search() || star() || conv() || dm() ||
    hasAdvanced() || !!(cid() || gid());

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sp(overrides: Record<string, string | undefined>) {
    setSearchParams({ ...overrides }, { replace: true });
  }

  function apply() {
    const p: NetworkParams = { order: order() };
    if (search())  p.search = search();
    if (tag())     p.tag    = tag();
    if (star())    p.star   = 1;
    if (conv())    p.conv   = 1;
    if (dm())      p.dm     = 1;
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

  function toggleFlag(key: string, current: boolean) {
    sp({ [key]: current ? undefined : "1" });
    setTimeout(apply, 0);
  }

  let searchTimer: ReturnType<typeof setTimeout>;
  function onSearchInput(val: string) {
    sp({ search: val || undefined });
    clearTimeout(searchTimer);
    searchTimer = setTimeout(apply, 400);
  }

  function clearAll() {
    setSearchParams(
      {
        order: undefined, search: undefined, tag: undefined,
        star: undefined, conv: undefined, dm: undefined,
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
    const q = connInput().toLowerCase().trim();
    if (!q || connections.loading) return [];
    return (connections() ?? [])
      .filter((c) => c.name.toLowerCase().includes(q) || c.link.toLowerCase().includes(q))
      .slice(0, 8);
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

  // ── View switcher (shared between rows) ───────────────────────────────────

  const ViewSwitcher = () => (
    <div class="flex rounded-lg border border-rim overflow-hidden shrink-0"
      role="group" aria-label="View mode">
      <For each={VIEWS}>
        {(v) => (
          <button
            title={v.label}
            aria-pressed={viewMode() === v.id}
            onClick={() => changeView(v.id)}
            class={`px-2 py-1.5 transition-colors
              ${viewMode() === v.id
                ? "bg-elevated text-txt"
                : "bg-surface text-muted hover:bg-elevated hover:text-txt"
              }`}
          >
            <v.Icon size={15} />
          </button>
        )}
      </For>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div class="space-y-1.5" use:helpable="network/index.activity-filters">

      {/* ══════════════════════════════════════════════════════════════════════
          Row 1 — always visible: refresh, order, toggles, utility icons
          On desktop the view switcher sits at the end of this row.
          On mobile it moves to row 2 so row 1 stays within ~380px.
      ══════════════════════════════════════════════════════════════════════ */}
      <div class="flex items-center gap-1 min-w-0">

        {/* Refresh */}
        <button
          onClick={() => { resetPosts(); loadNetwork(); }}
          disabled={loading()}
          title="Refresh"
          class="p-1.5 rounded-lg hover:bg-elevated transition-colors
                 disabled:opacity-40 text-muted hover:text-txt shrink-0
                 flex items-center justify-center"
        >
          <MdFillRefresh
            size={17}
            class={loading() ? "animate-spin" : ""}
          />
        </button>

        {/* Order — text labels on desktop, icon-only on mobile */}
        <div class="flex rounded-lg border border-rim overflow-hidden shrink-0">
          {ORDER_OPTIONS.map((opt) => (
            <button
              title={opt.label}
              onClick={() => setOrderAndApply(opt.value)}
              class={`flex items-center gap-1 py-1.5 transition-colors
                px-1.5 sm:px-2.5
                ${order() === opt.value
                  ? "bg-accent text-accent-txt"
                  : "bg-surface text-muted hover:bg-elevated"
                }`}
            >
              {/* Icon always shown */}
              <opt.Icon size={14} />
              {/* Label hidden on mobile */}
              <span class="hidden sm:inline text-xs font-medium">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Toggle chips — icon only, no text */}
        <button
          title="Starred"
          onClick={() => toggleFlag("star", star())}
          class={star() ? ICON_BTN_ACTIVE : ICON_BTN}
        >
          <MdFillStar size={15} />
        </button>
        <button
          title="Conversations"
          onClick={() => toggleFlag("conv", conv())}
          class={conv() ? ICON_BTN_ACTIVE : ICON_BTN}
        >
          <MdFillPerson size={15} />
        </button>
        <button
          title="Direct messages"
          onClick={() => toggleFlag("dm", dm())}
          class={dm() ? ICON_BTN_ACTIVE : ICON_BTN}
        >
          <MdFillMail size={15} />
        </button>

        {/* Spacer */}
        <div class="flex-1 min-w-0" />

        {/* ── Connection filter ── */}
        <Show
          when={!!(cid() || gid())}
          fallback={
            <Show
              when={connOpen()}
              fallback={
                <button onClick={openConn} title="Filter by connection" class={ICON_BTN}>
                  <MdFillPerson size={15} />
                </button>
              }
            >
              <div class="relative shrink-0">
                <input
                  ref={connInputRef}
                  type="text"
                  placeholder="Connection…"
                  value={connInput()}
                  onInput={(e) => { setConnInput(e.currentTarget.value); setConnSuggestOpen(true); }}
                  onFocus={() => connInput() && setConnSuggestOpen(true)}
                  onBlur={onConnBlur}
                  class={`${INPUT_CLS} w-28 sm:w-36`}
                />
                <Show when={connSuggestOpen() && suggestions().length > 0}>
                  <ul class="absolute z-50 top-full mt-1 right-0 w-60 max-h-56
                             overflow-y-auto rounded-lg border border-rim
                             bg-surface shadow-lg py-1">
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
            <button onClick={clearConnection} title="Remove"
              class="shrink-0 hover:opacity-70 transition-opacity">
              <MdFillClose size={12} />
            </button>
          </span>
        </Show>

        {/* ── Search ── */}
        <Show
          when={searchOpen() || !!search()}
          fallback={
            <button onClick={openSearch} title="Search" class={ICON_BTN}>
              <MdFillSearch size={15} />
            </button>
          }
        >
          <div class="relative shrink-0">
            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              <MdFillSearch size={13} />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search…"
              value={search()}
              onInput={(e) => onSearchInput(e.currentTarget.value)}
              onBlur={onSearchBlur}
              class={`${INPUT_CLS} w-28 sm:w-32 pl-6 pr-2`}
            />
          </div>
        </Show>

        {/* Advanced toggle */}
        <button
          onClick={() => setAdvOpen((v) => !v)}
          title="More filters"
          class={`relative ${advOpen() || hasAdvanced() ? ICON_BTN_ACTIVE : ICON_BTN}`}
        >
          <MdFillFilter_list size={14} />
          <Show when={hasAdvanced()}>
            <span class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
          </Show>
        </button>

        {/* Clear all */}
        <Show when={hasAnyFilter()}>
          <button onClick={clearAll} title="Clear filters"
            class="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-elevated
                   transition-colors shrink-0">
            <MdFillClose size={15} />
          </button>
        </Show>

        {/* View switcher — desktop only (row 1) */}
        <div class="hidden sm:flex ml-1">
          <ViewSwitcher />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Row 2 — mobile only: view switcher centred below filters
      ══════════════════════════════════════════════════════════════════════ */}
      <div class="flex sm:hidden justify-center">
        <ViewSwitcher />
      </div>

      {/* ── Advanced panel ── */}
      <Show when={advOpen()}>
        <div class="flex flex-wrap gap-2.5 p-3 rounded-lg bg-elevated border border-rim">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">Tag</span>
            <input
              type="text"
              placeholder="e.g. solidjs"
              value={tag()}
              onInput={(e) => sp({ tag: e.currentTarget.value || undefined })}
              onBlur={apply}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              class={INPUT_CLS}
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">From</span>
            <input type="date" value={dbegin()}
              onChange={(e) => { sp({ dbegin: e.currentTarget.value || undefined }); apply(); }}
              class={INPUT_CLS} />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">To</span>
            <input type="date" value={dend()}
              onChange={(e) => { sp({ dend: e.currentTarget.value || undefined }); apply(); }}
              class={INPUT_CLS} />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">Affinity min</span>
            <input type="number" min="0" placeholder="0" value={cmin()}
              onInput={(e) => sp({ cmin: e.currentTarget.value || undefined })}
              onBlur={apply} class={`${INPUT_CLS} w-20`} />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">Affinity max</span>
            <input type="number" min="0" placeholder="100" value={cmax()}
              onInput={(e) => sp({ cmax: e.currentTarget.value || undefined })}
              onBlur={apply} class={`${INPUT_CLS} w-20`} />
          </label>
        </div>
      </Show>
    </div>
  );
}
