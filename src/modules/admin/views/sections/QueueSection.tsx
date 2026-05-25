import { createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminQueue } from "../../api";

export default function QueueSection() {
  const [data, { refetch }] = createResource(fetchAdminQueue);

  return (
    <SubPageContent title="Inspect Queue" description="Undelivered outbound messages.">
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted">
                {d().total} undelivered message{d().total !== 1 ? "s" : ""} total
                {d().items.length < d().total ? ` (showing ${d().items.length})` : ""}
              </p>
              <button
                onClick={refetch}
                class="px-3 py-1.5 text-xs rounded-lg border border-rim text-txt hover:bg-elevated transition-colors"
              >
                Refresh
              </button>
            </div>

            <Show when={d().total === 0}>
              <p class="text-sm text-muted py-4 text-center">Queue is empty.</p>
            </Show>

            <Show when={d().items.length > 0}>
              <div class="rounded-lg border border-rim overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-rim bg-elevated">
                      <th class="px-3 py-2 text-left font-medium text-muted">Destination</th>
                      <th class="px-3 py-2 text-left font-medium text-muted hidden sm:table-cell">Updated</th>
                      <th class="px-3 py-2 text-left font-medium text-muted hidden md:table-cell">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={d().items}>
                      {(item) => (
                        <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                          <td class="px-3 py-2 text-txt truncate max-w-[16rem]" title={item.outq_posturl}>
                            {item.outq_posturl}
                          </td>
                          <td class="px-3 py-2 text-muted hidden sm:table-cell">{fmtDate(item.outq_updated)}</td>
                          <td class="px-3 py-2 text-muted hidden md:table-cell">{item.outq_priority}</td>
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

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <div class="h-4 w-40 rounded bg-elevated" />
      <div class="rounded-lg border border-rim overflow-hidden">
        {Array.from({ length: 5 }, () => (
          <div class="h-8 border-b border-rim bg-elevated/30 last:border-0" />
        ))}
      </div>
    </div>
  );
}
