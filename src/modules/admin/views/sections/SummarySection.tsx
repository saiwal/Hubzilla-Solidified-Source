import { createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminSummary } from "../../api/api";

export default function SummarySection() {
  const [data] = createResource(fetchAdminSummary);

  return (
    <SubPageContent title="Summary" description="Overview of this Hubzilla installation.">
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <div class="space-y-6">
            <StatGrid
              label="Accounts"
              stats={[
                { label: "Total", value: d().accounts.total },
                { label: "Blocked", value: d().accounts.blocked },
                { label: "Expired", value: d().accounts.expired },
                { label: "Expiring soon", value: d().accounts.expiring },
              ]}
            />

            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Channels" value={d().channels} />
              <Stat label="Pending registrations" value={d().pending} />
              <Stat label="Queued messages" value={d().queue} accent={d().queue > 0} />
            </div>

            <div class="space-y-1.5">
              <p class="text-sm font-medium text-txt">Version</p>
              <p class="text-sm text-muted font-mono">{d().version}</p>
            </div>

            <Show when={d().plugins.length > 0}>
              <div class="space-y-1.5">
                <p class="text-sm font-medium text-txt">Active plugins ({d().plugins.length})</p>
                <div class="flex flex-wrap gap-1.5">
                  <For each={d().plugins}>
                    {(p) => (
                      <span class="px-2 py-0.5 text-xs rounded-full bg-elevated text-muted border border-rim">
                        {p}
                      </span>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

function StatGrid(props: { label: string; stats: { label: string; value: number }[] }) {
  return (
    <div class="space-y-2">
      <p class="text-sm font-medium text-txt">{props.label}</p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <For each={props.stats}>{(s) => <Stat label={s.label} value={s.value} />}</For>
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: number; accent?: boolean }) {
  return (
    <div class="rounded-lg border border-rim bg-surface p-3 space-y-0.5">
      <p class={`text-lg font-semibold ${props.accent ? "text-accent" : "text-txt"}`}>
        {props.value.toLocaleString()}
      </p>
      <p class="text-xs text-muted">{props.label}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      <div class="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, () => (
          <div class="h-16 rounded-lg bg-elevated" />
        ))}
      </div>
      <div class="h-4 w-48 rounded bg-elevated" />
      <div class="h-4 w-32 rounded bg-elevated" />
    </div>
  );
}
