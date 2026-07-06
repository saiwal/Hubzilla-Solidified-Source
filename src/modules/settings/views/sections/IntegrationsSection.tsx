import { Show, For, createSignal, createMemo, createEffect } from "solid-js";
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
  MdFillArrow_upward,
  MdFillArrow_downward,
} from "solid-icons/md";
import { navOrder, setNavOrder } from "@/shared/store/nav-order";
import { refetchNavData } from "@/shared/store/nav-store";
import { useI18n } from "@/i18n";

interface AppEntry {
  name: string;
  description: string;
  photo: string;
  installed: boolean;
  pinned: boolean;
  featured: boolean;
  requires: string;
}

interface IntegrationsData {
  apps: AppEntry[];
  navOrder: string[];
}

type AppAction = "install" | "uninstall" | "pin" | "feature";
type FilterTab = "all" | "installed" | "available" | "order";

async function fetchIntegrations(): Promise<IntegrationsData> {
  const res = await apiFetch("/api/settings/integrations");
  if (!res.ok) throw new Error(`Failed to load apps: ${res.status}`);
  const { data } = await res.json();
  return {
    apps: data.apps as AppEntry[],
    navOrder: (data.nav_order as string[]) ?? [],
  };
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
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const query = useQuery(() => ({
    queryKey: ["settings", "integrations"] as const,
    queryFn: fetchIntegrations,
  }));
  const [search, setSearch] = createSignal("");
  const [filter, setFilter] = createSignal<FilterTab>("all");

  // Sync server-stored nav order into the local signal on load
  createEffect(() => {
    const d = query.data;
    if (d) setNavOrder(d.navOrder);
  });

  const apps = () => query.data?.apps ?? [];

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

  // All nav-visible apps (pinned or featured) merged with the stored display order
  const orderedNavApps = createMemo((): AppEntry[] => {
    const list = apps();
    const seen = new Set<string>();
    const navApps = list.filter((a) => {
      if (!(a.pinned || a.featured) || seen.has(a.name)) return false;
      seen.add(a.name);
      return true;
    });
    const order = navOrder();
    if (order.length === 0) return navApps;

    const byName = new Map(navApps.map((a) => [a.name, a]));
    const result: AppEntry[] = [];
    for (const name of order) {
      const app = byName.get(name);
      if (app) result.push(app);
    }
    const inOrder = new Set(order);
    for (const app of navApps) {
      if (!inOrder.has(app.name)) result.push(app);
    }
    return result;
  });

  const moveApp = (name: string, dir: -1 | 1) => {
    const order = orderedNavApps().map((a) => a.name);
    const i = order.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setNavOrder(order);
    apiFetch("/api/settings/integrations", {
      method: "POST",
      body: JSON.stringify({ action: "reorder", order }),
    }).catch(() => {});
  };

  const appMutation = useMutation(() => ({
    mutationFn: ({ app, action }: { app: AppEntry; action: AppAction }) =>
      appAction(app.name, action),
    onSuccess: async (_data, { app, action }) => {
      if (action === "pin" || action === "feature") {
        const current = navOrder();
        const isActivating = action === "pin" ? !app.pinned : !app.featured;
        const stillInNavOtherWay = action === "pin" ? app.featured : app.pinned;
        if (isActivating) {
          if (!current.includes(app.name)) setNavOrder([...current, app.name]);
        } else if (!stillInNavOtherWay) {
          setNavOrder(current.filter((n) => n !== app.name));
        }
        apiFetch("/api/settings/integrations", {
          method: "POST",
          body: JSON.stringify({ action: "reorder", order: navOrder() }),
        }).catch(() => {});
      }
      await queryClient.invalidateQueries({ queryKey: ["settings", "integrations"] });
      if (action === "install" || action === "uninstall") refetchNavData();
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
    { value: "order",     labelKey: "settings.integ_tab_order" },
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
        <Show when={filter() !== "order"}>
          <input
            type="search"
            placeholder={t("settings.integ_search_placeholder")}
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg bg-surface border border-rim
                   text-txt hover:border-rim-strong focus:outline-none focus:border-accent
                   placeholder:text-muted"
          />
        </Show>
      </div>

      {/* Nav Order tab */}
      <Show when={filter() === "order"}>
        <Show
          when={orderedNavApps().length > 0}
          fallback={
            <p class="text-sm text-muted text-center py-8">
              {t("settings.integ_no_pinned")}
            </p>
          }
        >
          <div class="divide-y divide-rim border border-rim rounded-lg overflow-hidden">
            <For each={orderedNavApps()}>
              {(app, index) => (
                <div class="flex items-center gap-3 px-3 py-2.5 bg-surface">
                  <AppIcon app={app} />
                  <span class="flex-1 text-sm font-medium text-txt truncate">{app.name}</span>
                  <div class="flex gap-0.5 shrink-0">
                    <button
                      type="button"
                      title={t("settings.integ_move_up")}
                      disabled={index() === 0}
                      onClick={() => moveApp(app.name, -1)}
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-muted
                             hover:bg-elevated hover:text-txt disabled:opacity-30
                             disabled:cursor-not-allowed transition-colors"
                    >
                      <MdFillArrow_upward size={16} />
                    </button>
                    <button
                      type="button"
                      title={t("settings.integ_move_down")}
                      disabled={index() === orderedNavApps().length - 1}
                      onClick={() => moveApp(app.name, 1)}
                      class="w-7 h-7 flex items-center justify-center rounded-lg text-muted
                             hover:bg-elevated hover:text-txt disabled:opacity-30
                             disabled:cursor-not-allowed transition-colors"
                    >
                      <MdFillArrow_downward size={16} />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* App list tabs */}
      <Show when={filter() !== "order"}>
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
