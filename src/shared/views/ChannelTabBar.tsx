// shared/views/ChannelTabBar.tsx
//
// Renders the permission-filtered tab bar for a channel page.
// Tabs come from /nav_api?format=json&channel_nick=:nick — the backend
// applies get_all_perms() so we only see tabs the viewer can actually access.
//
// Usage in your channel route component:
//   const nick = () => params.nick;  // from useParams()
//   <ChannelTabBar nick={nick} />

import { For, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import { useChannelTabs } from "../store/nav-store";
import type { NavChannelTab } from "../lib/nav-api";

// Bootstrap icon name → solid-icons or inline SVG.
// We use a simple character map here; swap for your icon component if preferred.
const TAB_ICONS: Record<string, string> = {
  house:                 "🏠",
  person:                "👤",
  image:                 "🖼",
  folder:                "📁",
  calendar:              "📅",
  chat:                  "💬",
  "layout-text-sidebar": "📄",
};

function TabIcon(props: { icon: string }) {
  return (
    <span class="text-base leading-none" aria-hidden="true">
      {TAB_ICONS[props.icon] ?? "•"}
    </span>
  );
}

function Tab(props: { tab: NavChannelTab; active: boolean }) {
  return (
    <a
      href={props.tab.url}
      class={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium
              border-b-2 transition-colors whitespace-nowrap
              ${props.active
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
    >
      <TabIcon icon={props.tab.icon} />
      {props.tab.label}
    </a>
  );
}
export default function ChannelTabBar(props: { nick: () => string | undefined }) {
  const tabs = useChannelTabs(() => props.nick());
  const location = useLocation();

  // Active tab: match by pathname prefix
  const isActive = (tab: NavChannelTab) => {
    try {
      const tabPath = new URL(tab.url).pathname;
      return location.pathname === tabPath || location.pathname.startsWith(tabPath + "/");
    } catch {
      return false;
    }
  };

  return (
    <Show when={!tabs.loading && (tabs()?.length ?? 0) > 0}>
      <nav
        class="flex items-end gap-0.5 border-b border-rim
               overflow-x-auto scrollbar-none -mx-4 px-4 lg:-mx-6 lg:px-6 mb-4"
        aria-label="Channel sections"
      >
        <For each={tabs()}>
          {(tab) => <Tab tab={tab} active={isActive(tab)} />}
        </For>
      </nav>
    </Show>
  );
}
