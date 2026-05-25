import { createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminProfileFields } from "../../api";

export default function ProfileFieldsSection() {
  const [fields] = createResource(fetchAdminProfileFields);

  return (
    <SubPageContent title="Profile Fields" description="Custom profile field definitions.">
      <Show when={fields()} fallback={<Skeleton />}>
        {(list) => (
          <div class="space-y-3">
            <p class="text-sm text-muted">{list().length} field(s) defined</p>

            <Show when={list().length === 0}>
              <p class="text-sm text-muted py-4 text-center">No custom profile fields defined.</p>
            </Show>

            <Show when={list().length > 0}>
              <div class="rounded-lg border border-rim overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-rim bg-elevated">
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted">ID</th>
                      <For each={Object.keys(list()[0] ?? {}).filter((k) => k !== "id")}>
                        {(col) => (
                          <th class="px-3 py-2 text-left text-xs font-medium text-muted">{col}</th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={list()}>
                      {(field) => (
                        <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                          <td class="px-3 py-2 text-muted font-mono">{field.id}</td>
                          <For each={Object.entries(field).filter(([k]) => k !== "id")}>
                            {([, v]) => (
                              <td class="px-3 py-2 text-txt text-xs truncate max-w-[12rem]">
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
      <div class="h-4 w-36 rounded bg-elevated" />
      <div class="rounded-lg border border-rim overflow-hidden">
        {Array.from({ length: 4 }, () => (
          <div class="h-10 border-b border-rim bg-elevated/30 last:border-0" />
        ))}
      </div>
    </div>
  );
}
