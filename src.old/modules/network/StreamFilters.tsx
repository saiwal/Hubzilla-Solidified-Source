import { createSignal, Show, batch } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { loadNetwork } from "./store";
import type { NetworkParams } from "./api";

type Order = NonNullable<NetworkParams["order"]>;

const ORDER_OPTIONS: { value: Order; label: string }[] = [
  { value: "created",    label: "Latest"   },
  { value: "commented",  label: "Active"   },
  { value: "unthreaded", label: "All"      },
];

export default function StreamFilters() {
  const [, setSearchParams] = useSearchParams();

  const [order,    setOrder]    = createSignal<Order>("created");
  const [search,   setSearch]   = createSignal("");
  const [tag,      setTag]      = createSignal("");
  const [star,     setStar]     = createSignal(false);
  const [conv,     setConv]     = createSignal(false);
  const [dm,       setDm]       = createSignal(false);
  const [dbegin,   setDbegin]   = createSignal("");
  const [dend,     setDend]     = createSignal("");
  const [cmin,     setCmin]     = createSignal("");
  const [cmax,     setCmax]     = createSignal("");
  const [expanded, setExpanded] = createSignal(false);

  let searchTimer: ReturnType<typeof setTimeout>;

  function buildParams(): NetworkParams {
    const p: NetworkParams = { order: order() };
    if (search())           p.search = search();
    if (tag())              p.tag    = tag();
    if (star())             p.star   = 1;
    if (conv())             p.conv   = 1;
    if (dm())               p.dm     = 1;
    if (dbegin())           p.dbegin = dbegin();
    if (dend())             p.dend   = dend();
    if (cmin())             p.cmin   = Number(cmin());
    if (cmax())             p.cmax   = Number(cmax());
    return p;
  }

  function apply() {
    const p = buildParams();
    // Sync to URL
    const sp: Record<string, string> = { order: order() };
    if (p.search)  sp.search = p.search;
    if (p.tag)     sp.tag    = p.tag;
    if (p.star)    sp.star   = "1";
    if (p.conv)    sp.conv   = "1";
    if (p.dm)      sp.dm     = "1";
    if (p.dbegin)  sp.dbegin = p.dbegin;
    if (p.dend)    sp.dend   = p.dend;
    if (p.cmin)    sp.cmin   = String(p.cmin);
    if (p.cmax)    sp.cmax   = String(p.cmax);
    setSearchParams(sp);
    loadNetwork(p);
  }

  function setOrderAndApply(o: Order) {
    setOrder(o);
    // createEffect would be async — call apply() after state settles
    setTimeout(apply, 0);
  }

  function toggleFlag(
    get: () => boolean,
    set: (v: boolean) => void,
  ) {
    set(!get());
    setTimeout(apply, 0);
  }

  function onSearchInput(val: string) {
    setSearch(val);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(apply, 400);
  }

  function clearAll() {
    batch(() => {
      setOrder("created");
      setSearch("");
      setTag("");
      setStar(false);
      setConv(false);
      setDm(false);
      setDbegin("");
      setDend("");
      setCmin("");
      setCmax("");
    });
    setTimeout(apply, 0);
  }

  const hasAdvanced = () => tag() || dbegin() || dend() || cmin() || cmax();
  const hasAnyFilter = () =>
    order() !== "created" || search() || star() || conv() || dm() || hasAdvanced();

  return (
    <div class="mb-4 space-y-2">
      {/* Row 1: order + toggles + search + expand */}
      <div class="flex items-center gap-2 flex-wrap">

        {/* Segmented order control */}
        <div class="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
          {ORDER_OPTIONS.map(opt => (
            <button
              onClick={() => setOrderAndApply(opt.value)}
              class={`px-3 py-1.5 text-sm font-medium transition-colors
                ${order() === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Flag toggles */}
        <ToggleChip active={star()} onClick={() => toggleFlag(star, setStar)} label="⭐ Starred" />
        <ToggleChip active={conv()} onClick={() => toggleFlag(conv, setConv)} label="💬 Personal Posts" />
        <ToggleChip active={dm()}   onClick={() => toggleFlag(dm,   setDm)}   label="✉️ DMs" />

        {/* Spacer */}
        <div class="flex-1" />

        {/* Search */}
        <div class="relative">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input
            type="search"
            placeholder="Search…"
            value={search()}
            onInput={e => onSearchInput(e.currentTarget.value)}
            class="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
          />
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          class={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors
            ${expanded() || hasAdvanced()
              ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M7 8h10M11 12h2M11 16h2"/>
          </svg>
          Filters
          <Show when={hasAdvanced()}>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </Show>
        </button>

        {/* Clear all */}
        <Show when={hasAnyFilter()}>
          <button
            onClick={clearAll}
            class="px-3 py-1.5 text-sm rounded-lg text-gray-500 dark:text-gray-400
                   hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            ✕ Clear
          </button>
        </Show>
      </div>

      {/* Row 2: advanced panel */}
      <Show when={expanded()}>
        <div class="flex flex-wrap gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60
                    border border-gray-200 dark:border-gray-700">

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">Tag</span>
            <input
              type="text"
              placeholder="e.g. solidjs"
              value={tag()}
              onInput={e => setTag(e.currentTarget.value)}
              onBlur={apply}
              onKeyDown={e => e.key === 'Enter' && apply()}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">From date</span>
            <input
              type="date"
              value={dbegin()}
              onChange={e => { setDbegin(e.currentTarget.value); apply(); }}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">To date</span>
            <input
              type="date"
              value={dend()}
              onChange={e => { setDend(e.currentTarget.value); apply(); }}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">Min Affinity</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={cmin()}
              onInput={e => setCmin(e.currentTarget.value)}
              onBlur={apply}
              class={`${inputCls} w-24`}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">Max Affinity</span>
            <input
              type="number"
              min="0"
              placeholder="100"
              value={cmax()}
              onInput={e => setCmax(e.currentTarget.value)}
              onBlur={apply}
              class={`${inputCls} w-24`}
            />
          </label>
        </div>
      </Show>
    </div>
  );
}

const inputCls = `px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700
  bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`;

function ToggleChip(props: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={props.onClick}
      class={`px-3 py-1.5 text-sm rounded-lg border transition-colors shrink-0
        ${props.active
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
    >
      {props.label}
    </button>
  );
}
