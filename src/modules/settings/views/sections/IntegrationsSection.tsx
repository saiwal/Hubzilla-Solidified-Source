import { Show, For, createSignal } from "solid-js";
import { createResource } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
// import { getCsrfToken } from "@/shared/lib/csrf"; // or however you get the token

interface AppEntry {
  name: string;
  description: string;
  photo: string;
  installed: boolean;
  requires: string;
}

async function fetchIntegrations(): Promise<{ apps: AppEntry[] }> {
  const res = await apiFetch("/api/settings/integrations");
  const { data } = await res.json();
  return data;
}

async function toggleApp(name: string, action: "install" | "uninstall"): Promise<void> {
  const res = await apiFetch("/api/settings/integrations", {
    method: "POST",
    body: JSON.stringify({ name, action }),
  });
  if (!res.ok) throw new Error("Failed");
}

export default function IntegrationsSection() {
  const [apps, { refetch }] = createResource(fetchIntegrations);
  const [busy, setBusy] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const toggle = async (app: AppEntry) => {
    setBusy(app.name);
    setError(null);
    try {
      await toggleApp(app.name, app.installed ? "uninstall" : "install");
      refetch();
    } catch {
      setError(`Failed to ${app.installed ? "uninstall" : "install"} ${app.name}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SubPageContent title="Integrations" description="Enable or disable apps and features for your channel.">
      <Show when={error()}>
        <p class="text-sm text-red-500 mb-4">{error()}</p>
      </Show>
      <Show when={apps()} fallback={<Skeleton />}>
        <div class="divide-y divide-rim">
          <For each={apps()!.apps}>
            {(app) => (
              <div class="flex items-center gap-3 py-3">
                <Show when={app.photo} fallback={
                  <div class="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center text-muted text-xs shrink-0">
                    {app.name[0]}
                  </div>
                }>
                  <img src={app.photo} alt={app.name}
                    class="w-9 h-9 rounded-lg object-cover shrink-0 bg-elevated" />
                </Show>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-txt">{app.name}</p>
                  <Show when={app.description}>
                    <p class="text-xs text-muted truncate">{app.description}</p>
                  </Show>
                </div>

                <button
                  type="button"
                  disabled={busy() === app.name}
                  onClick={() => toggle(app)}
                  class={`px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${app.installed
                      ? "border border-rim text-muted hover:bg-elevated"
                      : "bg-accent text-accent-txt hover:opacity-90"
                    }`}
                >
                  {busy() === app.name
                    ? "…"
                    : app.installed ? "Uninstall" : "Install"}
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
    </SubPageContent>
  );
}

function Skeleton() {
  return (
    <div class="divide-y divide-rim animate-pulse">
      {[...Array(6)].map(() => (
        <div class="flex items-center gap-3 py-3">
          <div class="w-9 h-9 rounded-lg bg-elevated shrink-0" />
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 w-32 rounded bg-elevated" />
            <div class="h-3 w-48 rounded bg-elevated" />
          </div>
          <div class="h-7 w-16 rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}
