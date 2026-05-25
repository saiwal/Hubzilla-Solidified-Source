import { createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminThemes } from "../../api";

export default function ThemesSection() {
  const [result] = createResource(fetchAdminThemes);

  return (
    <SubPageContent title="Themes" description="Themes available in the view/theme directory.">
      <Show when={result()} fallback={<Skeleton />}>
        {(r) => (
          <div class="space-y-2">
            <p class="text-sm text-muted">{r().themes.length} theme(s) found</p>
            <div class="space-y-2">
              <For each={r().themes}>
                {(theme) => (
                  <div class={`flex items-start justify-between gap-4 rounded-lg border p-3 bg-surface ${theme.current ? "border-accent" : "border-rim"}`}>
                    <div class="space-y-0.5 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-sm font-medium text-txt font-mono">{theme.name}</p>
                        <Show when={theme.current}>
                          <span class="px-1.5 py-0.5 text-xs rounded-full bg-accent/10 text-accent">Default</span>
                        </Show>
                        <Show when={theme.mobile}>
                          <span class="px-1.5 py-0.5 text-xs rounded-full bg-elevated text-muted">Mobile</span>
                        </Show>
                        <Show when={theme.experimental}>
                          <span class="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Experimental</span>
                        </Show>
                      </div>
                      <Show when={theme.description}>
                        <p class="text-xs text-muted">{theme.description}</p>
                      </Show>
                      <Show when={theme.version}>
                        <p class="text-xs text-muted">v{theme.version}</p>
                      </Show>
                    </div>
                    <Show when={!theme.compatible}>
                      <span class="shrink-0 px-2 py-0.5 text-xs rounded border border-red-300 text-red-600">Incompatible</span>
                    </Show>
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
