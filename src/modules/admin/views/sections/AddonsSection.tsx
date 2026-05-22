import { createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminAddons } from "../../api/api";

export default function AddonsSection() {
  const [addons] = createResource(fetchAdminAddons);

  return (
    <SubPageContent title="Addons" description="Plugins installed in the addon directory.">
      <Show when={addons()} fallback={<Skeleton />}>
        {(list) => (
          <div class="space-y-2">
            <p class="text-sm text-muted">{list().length} addon(s) found</p>
            <div class="space-y-2">
              <For each={list()}>
                {(addon) => (
                  <div class="flex items-start justify-between gap-4 rounded-lg border border-rim p-3 bg-surface">
                    <div class="space-y-0.5 min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="text-sm font-medium text-txt">{addon.name}</p>
                        <Show when={addon.active}>
                          <span class="px-1.5 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </span>
                        </Show>
                      </div>
                      <Show when={addon.description}>
                        <p class="text-xs text-muted truncate">{addon.description}</p>
                      </Show>
                      <div class="flex items-center gap-2 text-xs text-muted">
                        <Show when={addon.version}>
                          <span>v{addon.version}</span>
                        </Show>
                        <Show when={addon.author}>
                          <span>·</span>
                          <span>{addon.author}</span>
                        </Show>
                      </div>
                    </div>
                    <span class={`shrink-0 px-2 py-0.5 text-xs rounded border ${addon.installed ? "border-accent text-accent" : "border-rim text-muted"}`}>
                      {addon.installed ? "Installed" : "Not installed"}
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      {Array.from({ length: 4 }, () => (
        <div class="h-16 rounded-lg border border-rim bg-elevated/30" />
      ))}
    </div>
  );
}
