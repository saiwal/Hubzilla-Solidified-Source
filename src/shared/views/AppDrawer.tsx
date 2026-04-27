// shared/views/AppDrawer.tsx
//
// Slide-in panel listing all featured/system apps from /navapi.
// Triggered by a button in the sidebar footer (pass onClose to wire it up).

import { For, Show, createSignal } from "solid-js";
import { useFeaturedApps } from "../store/nav-store";
import type { NavApp } from "../lib/nav-api";

// Bootstrap Icon name → inline SVG path (subset we actually use).
// We render icons as <img src="icon:<name>"> is NOT a valid src, so we
// use a simple text fallback instead and let CSS handle the rest.
// If you have a BI sprite/font loaded, swap this for a <i class="bi bi-{name}"> approach.

function AppIcon(props: { app: NavApp }) {
  const { bi_icon, photo, label } = props.app;

  // Real image URL
  if (photo && !photo.startsWith("icon:")) {
    return (
      <img
        src={photo}
        alt={label}
        class="w-8 h-8 rounded object-cover"
      />
    );
  }

  // Bootstrap icon — render as a named char using the bi font if loaded,
  // otherwise fall back to a coloured initial tile.
  if (bi_icon) {
    return (
      <span class="w-8 h-8 flex items-center justify-center rounded
                   bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                   text-sm font-semibold select-none">
        <i class={`bi bi-${bi_icon}`} aria-hidden="true" />
      </span>
    );
  }

  // Final fallback: coloured initial
  return (
    <span class="w-8 h-8 flex items-center justify-center rounded
                 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                 text-sm font-bold select-none uppercase">
      {label.charAt(0)}
    </span>
  );
}

function AppTile(props: { app: NavApp; onClick?: () => void }) {
  return (
    <a
      href={props.app.url}
      onClick={props.onClick}
      class="flex flex-col items-center gap-1.5 p-3 rounded-xl
             hover:bg-elevated/60
             transition-colors text-center group cursor-pointer"
    >
      <AppIcon app={props.app} />
      <span class="text-xs text-gray-700 dark:text-gray-300
                   group-hover:text-gray-900 dark:group-hover:text-gray-100
                   leading-tight max-w-[5rem] truncate">
        {props.app.label}
      </span>
    </a>
  );
}

export default function AppDrawer(props: {
  open: boolean;
  onClose: () => void;
}) {
  const featured = useFeaturedApps();
  const [search, setSearch] = createSignal("");

  const filtered = () => {
    const q = search().toLowerCase().trim();
    if (!q) return featured();
    return featured().filter((a) => a.label.toLowerCase().includes(q));
  };

  return (
    <Show when={props.open}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-40 bg-black/30"
        onClick={props.onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        class="fixed inset-y-0 left-64 z-50 w-72
               bg-surface
               border-r border-rim
               flex flex-col shadow-xl"
        // on mobile there's no left sidebar — snap to left edge
        style={{ left: "var(--drawer-offset, 0)" }}
      >
        {/* Header */}
        <div class="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <h3 class="text-sm font-semibold text-txt">
            Apps
          </h3>
          <button
            onClick={props.onClose}
            class="p-1 rounded-lg text-gray-500 hover:bg-gray-100
                   dark:hover:bg-gray-700 transition-colors"
            aria-label="Close app drawer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div class="px-3 pb-2 shrink-0">
          <input
            type="search"
            placeholder="Find an app…"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="w-full px-3 py-1.5 text-sm rounded-lg
                   border border-rim
                   bg-gray-50 dark:bg-gray-900
                   text-txt
                   placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Grid */}
        <div class="flex-1 overflow-y-auto px-2 pb-4">
          <Show
            when={filtered().length > 0}
            fallback={
              <p class="text-center text-sm text-gray-400 dark:text-gray-500 mt-8">
                No apps found
              </p>
            }
          >
            <div class="grid grid-cols-3 gap-0.5">
              <For each={filtered()}>
                {(app) => <AppTile app={app} onClick={props.onClose} />}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
