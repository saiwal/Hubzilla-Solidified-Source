import { Show, For, createSignal, createMemo } from "solid-js";
import { createResource } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
import { getNavIcon, biToNavIcon } from "@/shared/views/NavItem";
import {
  MdFillPush_pin,
  MdOutlinePush_pin,
  MdFillStar,
  MdOutlineStar,
} from "solid-icons/md";

interface AppEntry {
  name: string;
  description: string;
  photo: string;
  installed: boolean;
  pinned: boolean;
  featured: boolean;
  requires: string;
}

type AppAction = "install" | "uninstall" | "pin" | "feature";

async function fetchIntegrations(): Promise<AppEntry[]> {
  const res = await apiFetch("/api/settings/integrations");
  if (!res.ok) throw new Error(`Failed to load apps: ${res.status}`);
  const { data } = await res.json();
  return data.apps as AppEntry[];
}

async function appAction(name: string, action: AppAction): Promise<void> {
  const res = await apiFetch("/api/settings/integrations", {
    method: "POST",
    body: JSON.stringify({ name, action }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Server error ${res.status}`);
  }
}

function AppIcon(props: { app: AppEntry }) {
  const biIcon = () => {
    const photo = props.app.photo;
    if (photo.startsWith("icon:")) return photo.slice(5);
    return "";
  };
  const iconKey = () => biToNavIcon(biIcon()) || props.app.name.toLowerCase();
  const isUrl = () => !props.app.photo.startsWith("icon:") && props.app.photo !== "";

  return (
    <Show
      when={isUrl()}
      fallback={
        <div class="w-9 h-9 rounded-lg bg-elevated flex items-center justify-center text-txt shrink-0">
          {getNavIcon(iconKey(), 18)}
        </div>
      }
    >
      <img
        src={props.app.photo}
        alt={props.app.name}
        class="w-9 h-9 rounded-lg object-cover shrink-0 bg-elevated"
      />
    </Show>
  );
}

export default function IntegrationsSection() {
  const [apps, { refetch }] = createResource(fetchIntegrations);
  const [busy, setBusy] = createSignal<string | null>(null); // "name:action"
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

  const isBusy = (name: string, action?: AppAction) =>
    action ? busy() === `${name}:${action}` : busy()?.startsWith(`${name}:`);

  const run = async (app: AppEntry, action: AppAction) => {
    setBusy(`${app.name}:${action}`);
    setError(null);
    try {
      await appAction(app.name, action);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SubPageContent
      title="Integrations"
      description="Install apps and pin them to your nav or app tray."
    >
      <Show when={error()}>
        <div class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error()}
        </div>
      </Show>

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
                  <AppIcon app={app} />

                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-txt leading-snug">{app.name}</p>
                    <Show when={app.description}>
                      <p class="text-xs text-muted truncate">{app.description}</p>
                    </Show>
                  </div>

                  {/* Pin / Feature toggles — only when installed */}
                  <Show when={app.installed}>
                    <div class="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={app.pinned ? "Unpin from nav" : "Pin to nav"}
                        disabled={!!isBusy(app.name)}
                        onClick={() => run(app, "pin")}
                        class={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                          disabled:opacity-40 disabled:cursor-not-allowed
                          ${app.pinned
                            ? "text-accent bg-accent/10 hover:bg-accent/20"
                            : "text-muted hover:bg-elevated hover:text-txt"
                          }`}
                      >
                        <Show
                          when={app.pinned}
                          fallback={<MdOutlinePush_pin size={16} />}
                        >
                          <MdFillPush_pin size={16} />
                        </Show>
                      </button>

                      <button
                        type="button"
                        title={app.featured ? "Remove from app tray" : "Add to app tray"}
                        disabled={!!isBusy(app.name)}
                        onClick={() => run(app, "feature")}
                        class={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                          disabled:opacity-40 disabled:cursor-not-allowed
                          ${app.featured
                            ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                            : "text-muted hover:bg-elevated hover:text-txt"
                          }`}
                      >
                        <Show
                          when={app.featured}
                          fallback={<MdOutlineStar size={16} />}
                        >
                          <MdFillStar size={16} />
                        </Show>
                      </button>
                    </div>
                  </Show>

                  <button
                    type="button"
                    disabled={!!isBusy(app.name)}
                    onClick={() => run(app, app.installed ? "uninstall" : "install")}
                    class={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-opacity
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${app.installed
                        ? "border border-rim text-muted hover:bg-elevated"
                        : "bg-accent text-accent-txt hover:opacity-90"
                      }`}
                  >
                    {isBusy(app.name, app.installed ? "uninstall" : "install")
                      ? "…"
                      : app.installed
                        ? "Remove"
                        : "Install"}
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
            <div class="flex gap-1">
              <div class="w-7 h-7 rounded-lg bg-elevated" />
              <div class="w-7 h-7 rounded-lg bg-elevated" />
            </div>
            <div class="h-7 w-16 rounded-lg bg-elevated" />
          </div>
        )}
      </For>
    </div>
  );
}
