import { For, Show } from "solid-js";
import type { FederationProtocol } from "../../api/api";
import { useI18n } from "@/i18n";
import { MdFillCheck } from "solid-icons/md";

export default function ProtocolsStep(props: {
  protocols: FederationProtocol[];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div class="space-y-4">
      <p class="text-sm text-muted">{t("channel_create.protocols_desc")}</p>

      <div class="space-y-2">
        <For each={props.protocols}>
          {(p) => {
            const checked = () => props.selected.has(p.name);
            return (
              <button
                type="button"
                onClick={() => props.onToggle(p.name)}
                class={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-lg border transition-colors
                  ${checked() ? "border-accent bg-accent/10" : "border-rim bg-surface hover:border-rim-strong"}`}
              >
                <Show
                  when={p.photo}
                  fallback={<div class="w-8 h-8 rounded-lg bg-elevated shrink-0" />}
                >
                  <img src={p.photo} alt="" class="w-8 h-8 rounded-lg object-cover shrink-0" />
                </Show>
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-medium text-txt">{p.name}</span>
                  <Show when={p.description}>
                    <span class="block text-xs text-muted mt-0.5">{p.description}</span>
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

      <p class="text-xs text-muted">{t("channel_create.protocols_hint")}</p>
    </div>
  );
}
