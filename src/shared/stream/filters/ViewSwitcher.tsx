import { For, type Component } from "solid-js";
import {
  MdFillAll_inbox, MdFillApps,
  MdFillFormat_list_bulleted, MdFillShort_text,
} from "solid-icons/md";
import type { ViewMode } from "@/shared/stream/types";

type IconType = Component<{ size?: number; class?: string }>;

const ALL_VIEWS: { id: ViewMode; label: string; icon: IconType }[] = [
  { id: "feed",    label: "Feed",  icon: MdFillShort_text },
  { id: "masonry", label: "Grid",  icon: MdFillApps },
  { id: "list",    label: "List",  icon: MdFillFormat_list_bulleted },
  { id: "inbox",   label: "Inbox", icon: MdFillAll_inbox },
];

export default function ViewSwitcher(props: {
  viewMode: ViewMode;
  onChange: (v: ViewMode) => void;
  available?: ViewMode[];
}) {
  const views = () =>
    props.available
      ? ALL_VIEWS.filter((v) => props.available!.includes(v.id))
      : ALL_VIEWS;

  return (
    <div class="flex gap-1 mb-4">
      <For each={views()}>
        {(v) => (
          <button
            title={v.label}
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
