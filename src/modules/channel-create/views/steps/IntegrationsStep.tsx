import { For, Show } from "solid-js";
import type { IntegrationApp } from "../../api/api";
import { useI18n } from "@/i18n";
import { MdFillCheck } from "solid-icons/md";
import { getNavIcon, biToNavIcon } from "@/shared/views/NavItem";

function AppIcon(props: { app: IntegrationApp }) {
  const biIcon = () => {
    const photo = props.app.photo;
    return photo.startsWith("icon:") ? photo.slice(5) : "";
  };
  const iconKey = () => biToNavIcon(biIcon()) || props.app.name.toLowerCase();
  const isUrl = () => !props.app.photo.startsWith("icon:") && props.app.photo !== "";

  return (
    <Show
      when={isUrl()}
      fallback={
        <div class="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center text-txt shrink-0">
          {getNavIcon(iconKey(), 16)}
        </div>
      }
    >
      <img src={props.app.photo} alt="" class="w-8 h-8 rounded-lg object-cover shrink-0 bg-elevated" />
    </Show>
  );
}

export default function IntegrationsStep(props: {
  integrations: IntegrationApp[];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div class="space-y-4">
      <p class="text-sm text-muted">{t("channel_create.integrations_desc")}</p>

      <div class="space-y-2">
        <For each={props.integrations}>
          {(app) => {
            const checked = () => props.selected.has(app.name);
            return (
              <button
                type="button"
                onClick={() => props.onToggle(app.name)}
                class={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors
                  ${checked() ? "border-accent bg-accent/10" : "border-rim bg-surface hover:border-rim-strong"}`}
              >
                <AppIcon app={app} />
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-medium text-txt">{app.name}</span>
                  <Show when={app.description}>
                    <span class="block text-xs text-muted mt-0.5">{app.description}</span>
                  </Show>
                </span>
                <span
                  class={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors
                    ${checked() ? "bg-accent border-accent text-accent-fg" : "border-rim-strong"}`}
                >
                  <Show when={checked()}>
                    <MdFillCheck class="w-3.5 h-3.5" />
                  </Show>
                </span>
              </button>
            );
          }}
        </For>
      </div>

      <p class="text-xs text-muted">{t("channel_create.integrations_hint")}</p>
    </div>
  );
}
