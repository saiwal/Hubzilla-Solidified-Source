// components/ViewSwitcher.tsx
import { MdFillAll_inbox, MdFillApps, MdFillFormat_list_bulleted, MdFillShort_text } from 'solid-icons/md';
import { changeView, viewMode } from '../store';
import type { ViewMode } from '../store';
import { For, type Component } from 'solid-js';
import { useI18n } from "@/i18n";
type IconType = Component<{ size?: number; class?: string }>;
const views: { id: ViewMode; key: string; icon: IconType }[] = [
  { id: 'feed',    key: 'feed',  icon: MdFillShort_text },
  { id: 'masonry', key: 'grid',  icon: MdFillApps},
  { id: 'list',    key: 'list',  icon: MdFillFormat_list_bulleted},
  { id: 'inbox',   key: 'inbox', icon: MdFillAll_inbox},
];

export default function ViewSwitcher() {
  const { t } = useI18n();
  return (
    <div class="flex gap-1 mb-4">
      <For each={views}>
        {(v) => (
          <button
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors
              ${viewMode() === v.id
                ? 'bg-elevated font-medium'
                : 'hover:bg-surface text-muted'}`}
            title={t(`network.${v.key}` as any)}
            onClick={() => changeView(v.id)}
          >
          <v.icon size={18} />
          </button>
        )}
      </For>
    </div>
  );
}
