// components/ViewSwitcher.tsx
import { MdFillAll_inbox, MdFillApps, MdFillFormat_list_bulleted } from 'solid-icons/md';
import { changeView, viewMode } from '../store/store';
import type { ViewMode } from '../store/store';
import { For, type Component } from 'solid-js';
type IconType = Component<{ size?: number; class?: string }>;
const views: { id: ViewMode; label: string; icon: IconType  }[]  = [
  { id: 'feed',    label: 'Feed', icon: MdFillFormat_list_bulleted },
  { id: 'masonry', label: 'Grid', icon: MdFillApps},
  { id: 'list',    label: 'List', icon: MdFillFormat_list_bulleted},
  { id: 'inbox',   label: 'Inbox', icon: MdFillAll_inbox},
] as const;

export default function ViewSwitcher() {
  return (
    <div class="flex gap-1 mb-4">
      <For each={views}>
        {(v) => (
          <button
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors
              ${viewMode() === v.id
                ? 'bg-gray-200 dark:bg-gray-700 font-medium'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}
						title={v.label}
            onClick={() => changeView(v.id)}
          >
          <v.icon size={18} />
          </button>
        )}
      </For>
    </div>
  );
}
