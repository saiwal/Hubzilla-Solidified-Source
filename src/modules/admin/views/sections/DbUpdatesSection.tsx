import { createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminDbUpdates } from "../../api/api";

export default function DbUpdatesSection() {
  const [updates] = createResource(fetchAdminDbUpdates);

  return (
    <SubPageContent title="DB Updates" description="Database structure update history.">
      <Show when={updates()} fallback={<Skeleton />}>
        {(list) => (
          <div class="space-y-3">
            <p class="text-sm text-muted">{list().length} record(s)</p>

            <Show when={list().length === 0}>
              <p class="text-sm text-muted py-4 text-center">No DB update records.</p>
            </Show>

            <Show when={list().length > 0}>
              <div class="rounded-lg border border-rim overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-rim bg-elevated">
                      <For each={Object.keys(list()[0] ?? {})}>
                        {(col) => (
                          <th class="px-3 py-2 text-left font-medium text-muted">{col}</th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={list()}>
                      {(row) => (
                        <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                          <For each={Object.values(row)}>
                            {(v) => (
                              <td class="px-3 py-2 text-txt truncate max-w-[12rem]">
                                {String(v ?? "—")}
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <div class="h-4 w-32 rounded bg-elevated" />
      <div class="rounded-lg border border-rim overflow-hidden">
        {Array.from({ length: 5 }, () => (
          <div class="h-8 border-b border-rim bg-elevated/30 last:border-0" />
        ))}
      </div>
    </div>
  );
}
