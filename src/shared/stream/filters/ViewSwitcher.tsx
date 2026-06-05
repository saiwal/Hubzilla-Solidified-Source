import { For, type Component } from "solid-js";
import {
  MdFillAll_inbox, MdFillApps,
  MdFillFormat_list_bulleted, MdFillShort_text,
} from "solid-icons/md";
import type { ViewMode } from "@/shared/stream/types";
import { useI18n } from "@/i18n";

type IconType = Component<{ size?: number; class?: string }>;

const ALL_VIEWS: { id: ViewMode; key: string; icon: IconType }[] = [
  { id: "feed",    key: "feed",  icon: MdFillShort_text },
  { id: "masonry", key: "grid",  icon: MdFillApps },
  { id: "list",    key: "list",  icon: MdFillFormat_list_bulleted },
  { id: "inbox",   key: "inbox", icon: MdFillAll_inbox },
];

export default function ViewSwitcher(props: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
  available?: ViewMode[];
}) {
  const { t } = useI18n();
  const views = () =>
    props.available
      ? ALL_VIEWS.filter((v) => props.available!.includes(v.id))
      : ALL_VIEWS;

  return (
    <div class="flex gap-1 mb-4">
      <For each={views()}>
        {(v) => (
          <button
            title={t(`network.${v.key}` as any)}
            onClick={() => props.onChange(v.id)}
            class={`px-3 py-1.5 text-sm rounded-lg transition-colors
              ${props.viewMode === v.id
                ? "bg-elevated text-txt font-medium"
                : "text-muted hover:bg-elevated"}`}
          >
            <v.icon size={18} />
          </button>
        )}
      </For>
    </div>
  );
}
