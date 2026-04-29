import { createSignal, Show, For, createResource } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { loadNetwork, loading } from "../store/store";
import {
  fetchConnections,
  type AclConnection,
  type NetworkParams,
} from "../api/api";
import {
  MdFillFilter_list,
  MdFillMail,
  MdFillPerson,
  MdFillRefresh,
  MdFillSearch,
  MdFillStar,
} from "solid-icons/md";
import { helpable } from "@/shared/lib/helpable";
import { FilterChip as ToggleChip } from "@/shared/stream/filters";
void helpable;

type Order = NonNullable<NetworkParams["order"]>;

const ORDER_OPTIONS: { value: Order; label: string }[] = [
  { value: "created", label: "Latest" },
  { value: "commented", label: "Active" },
  { value: "unthreaded", label: "All" },
];

const str = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

export default function StreamFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = createSignal(false);

  const [connInput, setConnInput] = createSignal("");
  const [connSuggestOpen, setConnSuggestOpen] = createSignal(false);
  const [connections] = createResource(fetchConnections);

  const order = (): Order => (str(searchParams.order) as Order) || "created";
  const search = () => str(searchParams.search);
  const tag = () => str(searchParams.tag);
  const star = () => searchParams.star === "1";
  const conv = () => searchParams.conv === "1";
  const dm = () => searchParams.dm === "1";
  const dbegin = () => str(searchParams.dbegin);
  const dend = () => str(searchParams.dend);
  const cmin = () => str(searchParams.cmin);
  const cmax = () => str(searchParams.cmax);
  const cid = () => str(searchParams.cid);
  const gid = () => str(searchParams.gid);
  const xchanLabel = () => str(searchParams.xchan_label); // can keep

  let searchTimer: ReturnType<typeof setTimeout>;

  function sp(overrides: Record<string, string | undefined>) {
    setSearchParams({ ...overrides }, { replace: true });
  }

  function buildParams(): NetworkParams {
    const p: NetworkParams = { order: order() };
    if (search()) p.search = search();
    if (tag()) p.tag = tag();
    if (star()) p.star = 1;
    if (conv()) p.conv = 1;
    if (dm()) p.dm = 1;
    if (dbegin()) p.dbegin = dbegin();
    if (dend()) p.dend = dend();
    if (cmin()) p.cmin = Number(cmin());
    if (cmax()) p.cmax = Number(cmax());
    if (cid()) p.cid = Number(cid());
    if (gid()) p.gid = Number(gid());
    return p;
  }

  function apply() {
    loadNetwork(buildParams());
  }

  function setOrderAndApply(o: Order) {
    sp({ order: o });
    setTimeout(apply, 0);
  }

  function toggleFlag(key: string, current: boolean) {
    sp({ [key]: current ? undefined : "1" });
    setTimeout(apply, 0);
  }

  function onSearchInput(val: string) {
    sp({ search: val || undefined });
    clearTimeout(searchTimer);
    searchTimer = setTimeout(apply, 400);
  }

  // ── Connection filter ──────────────────────────────────────────────────────

  const suggestions = () => {
    const q = connInput().toLowerCase().trim();
    if (!q || connections.loading) return [];
    return (connections() ?? [])
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.link.toLowerCase().includes(q),
      )
      .slice(0, 8);
  };

  function selectConnection(c: AclConnection) {
    // xchan is the portable identity key Hubzilla's network endpoint accepts
    sp({
      cid: c.type === "c" ? String(c.id) : undefined,
      gid: c.type === "g" ? String(c.id) : undefined,
      xchan_label: c.name,
    });
    setConnInput("");
    setConnSuggestOpen(false);
    setTimeout(apply, 0);
  }

  function clearConnection() {
    sp({ cid: undefined, gid: undefined, xchan_label: undefined });
    setConnInput("");
    setTimeout(apply, 0);
  }

  function onConnBlur() {
    setTimeout(() => setConnSuggestOpen(false), 150);
  }

  // ── Clear all ───────────────────────────────────────────────────────────────

  function clearAll() {
    setSearchParams(
      {
        order: undefined,
        search: undefined,
        tag: undefined,
        star: undefined,
        conv: undefined,
        dm: undefined,
        dbegin: undefined,
        dend: undefined,
        cmin: undefined,
        cmax: undefined,
        cid: undefined,
        gid: undefined,
        xchan_label: undefined,
      },
      { replace: true },
    );
    setConnInput("");
    setTimeout(apply, 0);
  }

  const hasAdvanced = () => tag() || dbegin() || dend() || cmin() || cmax();
  const hasAnyFilter = () =>
    order() !== "created" ||
    search() ||
    star() ||
    conv() ||
    dm() ||
    hasAdvanced() ||
    cid() ||
    gid();

  return (
    <div class="mb-4 space-y-2" use:helpable="network/index.activity-filters">
      <div class="flex items-center gap-2 flex-wrap">
        {/* Refresh */}
        <button
          onClick={() => loadNetwork()}
          disabled={loading()}
          title="Refresh"
          class="p-2 rounded-lg hover:bg-overlay transition-colors disabled:opacity-50 text-txt"
        >
          <span class={loading() ? "animate-spin inline-block" : ""}>
            <MdFillRefresh size={18} />
          </span>
        </button>

        {/* Order tabs */}
        <div class="flex rounded-lg border border-rim overflow-hidden shrink-0">
          {ORDER_OPTIONS.map((opt) => (
            <button
              onClick={() => setOrderAndApply(opt.value)}
              class={`px-3 py-1.5 text-sm font-medium transition-colors
                ${
                  order() === opt.value
                    ? "bg-accent text-white"
                    : "bg-surface text-muted hover:bg-overlay"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Toggle chips */}
        <ToggleChip
          active={star()}
          onClick={() => toggleFlag("star", star())}
          label={<MdFillStar size={17} />}
        />
        <ToggleChip
          active={conv()}
          onClick={() => toggleFlag("conv", conv())}
          label={<MdFillPerson size={17} />}
        />
        <ToggleChip
          active={dm()}
          onClick={() => toggleFlag("dm", dm())}
          label={<MdFillMail size={17} />}
        />

        <div class="flex-1" />

        {/* ── Connection filter ── */}
        <Show
          when={cid() || gid()}
          fallback={
            <div class="relative">
              <input
                type="text"
                placeholder="Filter by connection…"
                value={connInput()}
                onInput={(e) => {
                  setConnInput(e.currentTarget.value);
                  setConnSuggestOpen(true);
                }}
                onFocus={() => connInput() && setConnSuggestOpen(true)}
                onBlur={onConnBlur}
                class={`${inputCls} w-44`}
              />
              <Show when={connSuggestOpen() && suggestions().length > 0}>
                <ul
                  class="absolute z-50 top-full mt-1 left-0 w-64 max-h-60 overflow-y-auto
                           rounded-lg border border-rim
                           bg-surface shadow-lg py-1"
                >
                  <For each={suggestions()}>
                    {(c) => (
                      <li>
                        <button
                          onMouseDown={() => selectConnection(c)}
                          class="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left
                                 hover:bg-overlay transition-colors text-txt"
                        >
                          <Show when={c.photo}>
                            <img
                              src={c.photo}
                              alt=""
                              class="w-6 h-6 rounded-full shrink-0 object-cover bg-elevated"
                            />
                          </Show>
                          <span class="flex flex-col min-w-0">
                            <span class="truncate font-medium text-txt">
                              {c.name}
                            </span>
                            <span class="truncate text-xs text-muted">
                              {c.link || c.nick}
                            </span>
                          </span>
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          }
        >
          {/* Active chip */}
          <span
            class="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg
                        border border-accent bg-accent-muted
                        text-accent max-w-[180px]"
          >
            <MdFillPerson size={17} class="shrink-0" />
            <span class="truncate">{xchanLabel() || cid() || gid()}</span>
            <button
              onClick={clearConnection}
              class="shrink-0 ml-0.5 hover:opacity-70 transition-opacity"
              title="Remove filter"
            >
              ✕
            </button>
          </span>
        </Show>

        {/* Text search */}
        <div class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
            <MdFillSearch size={17} />
          </span>
          <input
            type="search"
            placeholder="Search…"
            value={search()}
            onInput={(e) => onSearchInput(e.currentTarget.value)}
            class="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-rim
                   bg-surface text-txt
                   placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent w-40"
          />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          class={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors
            ${
              expanded() || hasAdvanced()
                ? "border-accent text-accent bg-accent-muted"
                : "border-rim text-muted bg-surface hover:bg-overlay"
            }`}
        >
          <MdFillFilter_list size={17} />
          <Show when={hasAdvanced()}>
            <span class="w-1.5 h-1.5 rounded-full bg-accent" />
          </Show>
        </button>

        <Show when={hasAnyFilter()}>
          <button
            onClick={clearAll}
            class="px-3 py-1.5 text-sm rounded-lg text-muted
                   hover:text-accent transition-colors"
          >
            ✕ Clear
          </button>
        </Show>
      </div>

      {/* Advanced panel */}
      <Show when={expanded()}>
        <div
          class="flex flex-wrap gap-3 p-3 rounded-lg bg-overlay
                    border border-rim"
        >
          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">
              Tag
            </span>
            <input
              type="text"
              placeholder="e.g. solidjs"
              value={tag()}
              onInput={(e) => {
                sp({ tag: e.currentTarget.value || undefined });
              }}
              onBlur={apply}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">
              From date
            </span>
            <input
              type="date"
              value={dbegin()}
              onChange={(e) => {
                sp({ dbegin: e.currentTarget.value || undefined });
                apply();
              }}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">
              To date
            </span>
            <input
              type="date"
              value={dend()}
              onChange={(e) => {
                sp({ dend: e.currentTarget.value || undefined });
                apply();
              }}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">
              Min Affinity
            </span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={cmin()}
              onInput={(e) => sp({ cmin: e.currentTarget.value || undefined })}
              onBlur={apply}
              class={`${inputCls} w-24`}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-muted font-medium">
              Max Affinity
            </span>
            <input
              type="number"
              min="0"
              placeholder="100"
              value={cmax()}
              onInput={(e) => sp({ cmax: e.currentTarget.value || undefined })}
              onBlur={apply}
              class={`${inputCls} w-24`}
            />
          </label>
        </div>
      </Show>
    </div>
  );
}

const inputCls = `px-2.5 py-1.5 text-sm rounded-lg border border-rim
  bg-surface text-txt
  placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent`;

