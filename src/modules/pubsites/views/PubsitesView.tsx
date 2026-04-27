import { createResource, For, Show, createSignal, createMemo } from 'solid-js';
import { fetchPubsites, type PubSite } from '../api';

const ACCESS_STYLES: Record<string, string> = {
  free:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  tiered: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  paid:   'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const REGISTER_STYLES: Record<string, string> = {
  open:    'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  approve: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  closed:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

function Badge(props: { label: string; styles: Record<string, string> }) {
  const cls = () =>
    props.styles[props.label.toLowerCase()] ??
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${cls()}`}>
      {props.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 animate-pulse">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div class="h-4 w-40 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div class="flex gap-2">
        <div class="h-5 w-12 rounded-md bg-gray-100 dark:bg-gray-800" />
        <div class="h-5 w-16 rounded-md bg-gray-100 dark:bg-gray-800" />
      </div>
      <div class="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

function HubCard(props: { site: PubSite }) {
  const initial = () => props.site.urltext.charAt(0).toUpperCase();
  const version = () => props.site.version ? `v${props.site.version}` : '';

  return (
		<a 
      href={props.site.register_url}
      target="_blank"
      rel="noopener noreferrer"
      class="group block rounded-xl border border-gray-100 dark:border-gray-800
             bg-white dark:bg-gray-900 p-4 space-y-3
             hover:border-gray-300 dark:hover:border-gray-600
             hover:shadow-sm transition-all duration-200"
    >
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600
                    flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {initial()}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-txt truncate
                    group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {props.site.urltext}
          </p>
          <Show when={props.site.location}>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {props.site.location}
            </p>
          </Show>
        </div>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <Badge label={props.site.access} styles={ACCESS_STYLES} />
        <Badge label={props.site.register} styles={REGISTER_STYLES} />
      </div>

      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-400 dark:text-gray-500">
          {props.site.project}
          <Show when={version()}>
            <span class="ml-1 font-mono">{version()}</span>
          </Show>
        </span>
        <svg class="w-3.5 h-3.5 text-gray-300 dark:text-gray-700 group-hover:text-indigo-400
                    group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

export default function PubsitesView() {
  const [sites] = createResource(fetchPubsites);
  const [filter, setFilter] = createSignal('');
  const [accessFilter, setAccessFilter] = createSignal('all');
  const [registerFilter, setRegisterFilter] = createSignal('all');

  const filtered = createMemo(() => {
    const q = filter().toLowerCase();
    return (sites() ?? []).filter((s) => {
      const matchText = !q || s.urltext.toLowerCase().includes(q) || s.location?.toLowerCase().includes(q);
      const matchAccess = accessFilter() === 'all' || s.access === accessFilter();
      const matchReg = registerFilter() === 'all' || s.register === registerFilter();
      return matchText && matchAccess && matchReg;
    });
  });

  return (
    <div class="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 class="text-2xl font-bold text-txt">Public Hubs</h1>
        <p class="mt-1 text-sm text-muted max-w-2xl">
          All hubs are interlinked — joining any gives you membership across the whole network.
        </p>
      </div>

      {/* Filters */}
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          placeholder="Search hubs or location…"
          value={filter()}
          onInput={(e) => setFilter(e.currentTarget.value)}
          class="flex-1 px-3 py-2 text-sm rounded-lg border border-rim
                 bg-white dark:bg-gray-900 text-txt
                 placeholder:text-gray-400 focus:outline-none focus:ring-2
                 focus:ring-indigo-500/40 focus:border-indigo-400 transition"
        />
        <select
          value={accessFilter()}
          onChange={(e) => setAccessFilter(e.currentTarget.value)}
          class="px-3 py-2 text-sm rounded-lg border border-rim
                 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
        >
          <option value="all">All access</option>
          <option value="free">Free</option>
          <option value="tiered">Tiered</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={registerFilter()}
          onChange={(e) => setRegisterFilter(e.currentTarget.value)}
          class="px-3 py-2 text-sm rounded-lg border border-rim
                 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
        >
          <option value="all">All registration</option>
          <option value="open">Open</option>
          <option value="approve">Approval</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Stats row */}
      <Show when={!sites.loading && (sites()?.length ?? 0) > 0}>
        <div class="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span>{filtered().length} of {sites()!.length} hubs</span>
          <span>·</span>
          <span>{sites()!.filter(s => s.register === 'open').length} open registration</span>
          <span>·</span>
          <span>{sites()!.filter(s => s.access === 'free').length} free access</span>
        </div>
      </Show>

      {/* Loading */}
      <Show when={sites.loading}>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <For each={Array(9).fill(0)}>{() => <SkeletonCard />}</For>
        </div>
      </Show>

      {/* Empty */}
      <Show when={!sites.loading && filtered().length === 0}>
        <div class="text-center py-16 text-gray-400 dark:text-gray-600">
          <p class="text-4xl mb-3">○</p>
          <p class="text-sm">No hubs match your filters</p>
        </div>
      </Show>

      {/* Grid */}
      <Show when={!sites.loading && filtered().length > 0}>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <For each={filtered()}>{(site) => <HubCard site={site} />}</For>
        </div>
      </Show>
    </div>
  );
}
