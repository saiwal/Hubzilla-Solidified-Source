import { Show, For, createSignal, createMemo } from "solid-js";
import { createResource } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";

interface AppEntry {
  name: string;
  description: string;
  photo: string;
  installed: boolean;
  requires: string;
}

async function fetchIntegrations(): Promise<AppEntry[]> {
  const res = await apiFetch("/api/settings/integrations");
  if (!res.ok) throw new Error(`Failed to load apps: ${res.status}`);
  const { data } = await res.json();
  return data.apps as AppEntry[];
}

async function toggleApp(name: string, action: "install" | "uninstall"): Promise<void> {
  const res = await apiFetch("/api/settings/integrations", {
    method: "POST",
    body: JSON.stringify({ name, action }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = body?.error?.message ?? `Server error ${res.status}`;
    throw new Error(msg);
  }
}

export default function IntegrationsSection() {
  const [apps, { refetch }] = createResource(fetchIntegrations);
  const [busy, setBusy] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [search, setSearch] = createSignal("");
  const [filter, setFilter] = createSignal<"all" | "installed" | "available">("all");

  const filtered = createMemo(() => {
    const list = apps() ?? [];
    const q = search().toLowerCase();
    return list.filter((app) => {
      if (filter() === "installed" && !app.installed) return false;
      if (filter() === "available" && app.installed) return false;
      if (q && !app.name.toLowerCase().includes(q) && !app.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  });

  const toggle = async (app: AppEntry) => {
    setBusy(app.name);
    setError(null);
    try {
      await toggleApp(app.name, app.installed ? "uninstall" : "install");
      await refetch();
    } catch (e) {
      const verb = app.installed ? "remove" : "install";
      const detail = e instanceof Error ? e.message : "Unknown error";
      setError(`Could not ${verb} ${app.name}: ${detail}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SubPageContent
      title="Integrations"
      description="Enable or disable apps and features for your channel."
    >
      {/* Error banner */}
      <Show when={error()}>
        <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error()}
        </div>
      </Show>

      {/* Search + filter toolbar */}
      <div class="flex gap-2 flex-wrap">
        <input
          type="search"
          placeholder="Search apps…"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg bg-surface border border-rim
                 text-txt hover:border-rim-strong focus:outline-none focus:border-accent
                 placeholder:text-muted"
        />
        <div class="flex rounded-lg border border-rim overflow-hidden text-xs font-medium">
          <For each={["all", "installed", "available"] as const}>
            {(tab) => (
              <button
                type="button"
                onClick={() => setFilter(tab)}
                class={`px-3 py-1.5 capitalize transition-colors
                  ${filter() === tab
                    ? "bg-elevated text-txt"
                    : "text-muted hover:bg-elevated hover:text-txt"
                  }`}
              >
                {tab}
              </button>
            )}
          </For>
        </div>
      </div>

      {/* List */}
      <Show when={!apps.loading} fallback={<Skeleton />}>
        <Show
          when={filtered().length > 0}
          fallback={
            <p class="text-sm text-muted text-center py-8">No apps match your search.</p>
          }
        >
          <div class="divide-y divide-rim">
            <For each={filtered()}>
              {(app) => (
                <div class="flex items-center gap-3 py-3">
                  <Show
                    when={app.photo}
                    fallback={
                      <div class="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center
                                  text-muted text-xs shrink-0 select-none font-medium">
                        {app.name[0]?.toUpperCase()}
                      </div>
                    }
                  >
                    <img
                      src={app.photo}
                      alt={app.name}
                      class="w-9 h-9 rounded-lg object-cover shrink-0 bg-elevated"
                    />
                  </Show>

                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-txt leading-snug">{app.name}</p>
                    <Show when={app.description}>
                      <p class="text-xs text-muted truncate">{app.description}</p>
                    </Show>
                  </div>

                  <button
                    type="button"
                    disabled={busy() !== null}
                    onClick={() => toggle(app)}
                    class={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${app.installed
                        ? "border border-rim text-muted hover:bg-elevated"
                        : "bg-accent text-accent-txt hover:opacity-90"
                      }`}
                  >
                    {busy() === app.name ? "…" : app.installed ? "Remove" : "Install"}
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </SubPageContent>
  );
}

function Skeleton() {
  return (
    <div class="divide-y divide-rim animate-pulse">
      <For each={[0, 1, 2, 3, 4, 5]}>
        {() => (
          <div class="flex items-center gap-3 py-3">
            <div class="w-9 h-9 rounded-lg bg-elevated shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3.5 w-32 rounded bg-elevated" />
              <div class="h-3 w-48 rounded bg-elevated" />
            </div>
            <div class="h-7 w-16 rounded-lg bg-elevated" />
          </div>
        )}
      </For>
    </div>
  );
}
