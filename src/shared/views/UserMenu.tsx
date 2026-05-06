import type { NavViewer, NavActions } from "@/shared/lib/nav-api";
import { Show } from "solid-js";

interface NavUtilitiesProps {
  viewer?: NavViewer;
  actions?: NavActions;
  actionsOpen?: boolean;
  onUserMenuToggle?: () => void;
}

const Usermenu = (props: NavUtilitiesProps) => {
  const isAuthenticated = () =>
    props.viewer?.is_local || props.viewer?.is_remote || props.viewer?.is_admin;
  return (
    <Show when={isAuthenticated() && props.onUserMenuToggle}>
      <div class="mt-3 pt-2 border-t border-rim flex items-center gap-0.5 px-2.5 justify-start">
        <button
          onClick={props.onUserMenuToggle}
          title={props.viewer!.name}
          class={`relative p-0.5 rounded-lg transition-colors hover:bg-elevated
                  focus-visible:outline-none flex items-center justify-start
                  ${props.actionsOpen ? "bg-elevated ring-2 ring-accent/40" : ""}`}
        >
          <div class="flex items-center gap-2">
            {/* Avatar */}
            <div class="relative flex-shrink-0 pe-2">
              <img
                src={props.viewer!.avatar}
                alt={props.viewer!.name}
                class="w-7 h-7 rounded-lg object-cover select-none"
                loading="lazy"
              />
              <span
                class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                       bg-green-500 border-2 border-surface"
                aria-hidden="true"
              />
            </div>

            {/* Text (stacked) */}
            <div class="flex flex-col leading-tight text-left min-w-0">
              <span class="text-sm font-medium text-txt">
                {props.viewer!.name}
              </span>
              <span class="text-xs text-muted truncate">
                {props.viewer!.nick ?? "No address"}
              </span>
            </div>
          </div>
        </button>
      </div>
    </Show>
  );
};

export default Usermenu;
