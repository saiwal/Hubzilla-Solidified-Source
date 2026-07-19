import { Show, For, createSignal, createMemo } from "solid-js";
import { toast } from "@/shared/store/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
import { getNavIcon, biToNavIcon } from "@/shared/views/NavItem";
import {
  MdFillPush_pin,
  MdOutlinePush_pin,
  MdFillStar,
  MdOutlineStar,
  MdOutlineSettings,
} from "solid-icons/md";
import { refetchNavData } from "@/shared/store/nav-store";
import { useI18n } from "@/i18n";
import NsfwConfigModal from "./NsfwConfigModal";

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
type FilterTab = "all" | "installed" | "available";

async function fetchIntegrations(): Promise<AppEntry[]> {
  const res = await apiFetch("/spa/settings/integrations");
  if (!res.ok) throw new Error(`Failed to load apps: ${res.status}`);
  const { data } = await res.json();
  return data.apps as AppEntry[];
}

async function appAction(name: string, action: AppAction): Promise<void> {
  const res = await apiFetch("/spa/settings/integrations", {
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
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery(() => ({
    queryKey: ["settings", "integrations"] as const,
    queryFn: fetchIntegrations,
  }));
  const [search, setSearch] = createSignal("");
  const [filter, setFilter] = createSignal<FilterTab>("all");
  const [showNsfwConfig, setShowNsfwConfig] = createSignal(false);

  const apps = () => query.data ?? [];

  const filtered = createMemo(() => {
    const list = apps();
    const q = search().toLowerCase();
    return list.filter((app) => {
      if (filter() === "installed" && !app.installed) return false;
      if (filter() === "available" && app.installed) return false;
      if (q && !app.name.toLowerCase().includes(q) && !app.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  });

  const appMutation = useMutation(() => ({
    mutationFn: ({ app, action }: { app: AppEntry; action: AppAction }) =>
      appAction(app.name, action),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "integrations"] });
      refetchNavData();
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Unknown error");
    },
  }));

  // While the mutation is in flight, `variables` holds the pending {app, action}
  const isBusy = (name: string, action?: AppAction) =>
    appMutation.isPending &&
    appMutation.variables?.app.name === name &&
    (!action || appMutation.variables.action === action);

  const run = (app: AppEntry, action: AppAction) => appMutation.mutate({ app, action });

  const TABS: { value: FilterTab; labelKey: string }[] = [
    { value: "all",       labelKey: "settings.integ_tab_all" },
    { value: "installed", labelKey: "settings.integ_tab_installed" },
    { value: "available", labelKey: "settings.integ_tab_available" },
  ];

  return (
    <SubPageContent
      title={t("settings.title_integrations")}
      description={t("settings.desc_integrations")}
    >
      <div class="flex gap-2 flex-wrap">
        <div class="flex rounded-lg border border-rim overflow-hidden text-xs font-medium">
          <For each={TABS}>
            {(tab) => (
              <button
                type="button"
                onClick={() => setFilter(tab.value)}
                class={`px-3 py-1.5 transition-colors
                  ${filter() === tab.value
                    ? "bg-elevated text-txt"
                    : "text-muted hover:bg-elevated hover:text-txt"
                  }`}
              >
                {t(tab.labelKey as any)}
              </button>
            )}
          </For>
        </div>
        <input
          type="search"
          placeholder={t("settings.integ_search_placeholder")}
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg bg-surface border border-rim
                 text-txt hover:border-rim-strong focus:outline-none focus:border-accent
                 placeholder:text-muted"
        />
      </div>

      <Show when={!query.isPending} fallback={<Skeleton />}>
        <Show
          when={filtered().length > 0}
          fallback={
            <p class="text-sm text-muted text-center py-8">{t("settings.integ_no_results")}</p>
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
                        title={app.pinned ? t("settings.integ_unpin") : t("settings.integ_pin")}
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
                        title={app.featured ? t("settings.integ_unfeature") : t("settings.integ_feature")}
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

                      <Show when={app.name.toLowerCase() === "nsfw"}>
                        <button
                          type="button"
                          title={t("settings.integ_configure")}
                          onClick={() => setShowNsfwConfig(true)}
                          class="w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                                 text-muted hover:bg-elevated hover:text-txt"
                        >
                          <MdOutlineSettings size={16} />
                        </button>
                      </Show>
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
                        : "bg-accent text-accent-fg hover:opacity-90"
                      }`}
                  >
                    {isBusy(app.name, app.installed ? "uninstall" : "install")
                      ? t("settings.integ_busy")
                      : app.installed
                        ? t("settings.integ_remove")
                        : t("settings.integ_install")}
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <Show when={showNsfwConfig()}>
        <NsfwConfigModal onClose={() => setShowNsfwConfig(false)} />
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
