import { createSignal, Show, type JSX } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { loadNetwork, loading } from "../store/store";
import type { NetworkParams } from "../api/api";
import { MdFillFilter_list, MdFillMail, MdFillPerson, MdFillRefresh, MdFillSearch, MdFillStar } from "solid-icons/md";

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

  function clearAll() {
    setSearchParams(
      { order: undefined, search: undefined, tag: undefined,
        star: undefined, conv: undefined, dm: undefined,
        dbegin: undefined, dend: undefined, cmin: undefined, cmax: undefined },
      { replace: true }
    );
    setTimeout(apply, 0);
  }

  const hasAdvanced = () => tag() || dbegin() || dend() || cmin() || cmax();
  const hasAnyFilter = () =>
    order() !== "created" || search() || star() || conv() || dm() || hasAdvanced();

  return (
    <div class="mb-4 space-y-2">
      <div class="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => loadNetwork()}
          disabled={loading()}
          title="Refresh"
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <span class={loading() ? "animate-spin inline-block" : ""}>
            <MdFillRefresh size={18} />
          </span>
        </button>

        <div class="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
          {ORDER_OPTIONS.map((opt) => (
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

        <ToggleChip active={star()} onClick={() => toggleFlag("star", star())} label={<MdFillStar size={17} />} />
        <ToggleChip active={conv()} onClick={() => toggleFlag("conv", conv())} label={<MdFillPerson size={17} />} />
        <ToggleChip active={dm()}   onClick={() => toggleFlag("dm",   dm())}   label={<MdFillMail size={17} />} />

        <div class="flex-1" />

        <div class="relative">
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <MdFillSearch size={14} />
          </span>
          <input
            type="search"
            placeholder="Search…"
            value={search()}
            onInput={(e) => onSearchInput(e.currentTarget.value)}
            class="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                   placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
          />
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          class={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors
            ${expanded() || hasAdvanced()
              ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
        >
          <MdFillFilter_list size={14} />
          <Show when={hasAdvanced()}>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </Show>
        </button>

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

      <Show when={expanded()}>
        <div class="flex flex-wrap gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60
                    border border-gray-200 dark:border-gray-700">
          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">Tag</span>
            <input
              type="text"
              placeholder="e.g. solidjs"
              value={tag()}
              onInput={(e) => { sp({ tag: e.currentTarget.value || undefined }); }}
              onBlur={apply}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">From date</span>
            <input
              type="date"
              value={dbegin()}
              onChange={(e) => { sp({ dbegin: e.currentTarget.value || undefined }); apply(); }}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">To date</span>
            <input
              type="date"
              value={dend()}
              onChange={(e) => { sp({ dend: e.currentTarget.value || undefined }); apply(); }}
              class={inputCls}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">Min Affinity</span>
            <input
              type="number" min="0" placeholder="0"
              value={cmin()}
              onInput={(e) => sp({ cmin: e.currentTarget.value || undefined })}
              onBlur={apply}
              class={`${inputCls} w-24`}
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">Max Affinity</span>
            <input
              type="number" min="0" placeholder="100"
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

const inputCls = `px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700
  bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`;

function ToggleChip(props: {
  active: boolean;
  onClick: () => void;
  label: string | JSX.Element;
}) {
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
