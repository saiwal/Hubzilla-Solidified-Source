// components/ViewSwitcher.tsx
import { setViewMode, viewMode } from '../store/store';
import type { ViewMode } from '../store/store';
import { For } from 'solid-js';

const views: { id: ViewMode; label: string }[]  = [
  { id: 'feed',    label: 'Feed' },
  { id: 'masonry', label: 'Grid' },
  { id: 'list',    label: 'List' },
  { id: 'inbox',   label: 'Inbox'},
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
            onClick={() => setViewMode(v.id)}
          >
            {v.label}
          </button>
        )}
      </For>
    </div>
  );
}
