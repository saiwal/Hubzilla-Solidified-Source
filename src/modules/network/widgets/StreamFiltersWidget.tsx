import { useSearchParams } from "@solidjs/router";
import {
  MdFillStar,
  MdFillNotifications,
  MdFillPerson,
  MdFillMail,
  MdFillEvent,
  MdFillClose,
  MdFillFolder,
  MdFillGroup,
  MdFillKeyboard_arrow_down,
  MdFillKeyboard_arrow_right,
  MdFillTag,
  MdFillDate_range,
  MdFillPeople,
  MdFillPoll,
} from "solid-icons/md";
import { createSignal, createEffect, For, Show } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { useI18n } from "@/i18n";
import { loadNetwork, resetPosts } from "../store";
import { fetchFolders, parseNetworkParams } from "../api";
import { useInstalledApps } from "@/shared/store/nav-store";
import { fetchGroups, type PrivacyGroup } from "@/modules/directory/groups/api";

const CHIPS = [
  { key: "star",  labelKey: "network.starred",         Icon: MdFillStar          },
  { key: "pf",   labelKey: "network.following",        Icon: MdFillNotifications },
  { key: "conv", labelKey: "network.conversations",    Icon: MdFillPerson        },
  { key: "dm",   labelKey: "network.direct_messages",  Icon: MdFillMail          },
  { key: "event",labelKey: "network.events",           Icon: MdFillEvent         },
  { key: "poll", labelKey: "network.polls",            Icon: MdFillPoll          },
] as const;

const str = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const INPUT_CLS =
  "h-8 w-full text-sm border border-rim rounded-lg bg-surface text-txt " +
  "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent " +
  "py-1.5 px-2.5";

// ── Affinity slider ───────────────────────────────────────────────────────────

const AFFINITY_MAX = 99;

const THUMB_CLS = [
  // Fill the full track area but only capture events on the thumb itself
  "absolute inset-0 w-full h-full appearance-none bg-transparent pointer-events-none",
  "[&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-sm",
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:cursor-grab",
  "[&::-moz-range-track]:bg-transparent [&::-moz-range-progress]:bg-transparent",
  "[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:[border:2px_solid_var(--color-accent)] [&::-moz-range-thumb]:shadow-sm",
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:cursor-grab",
].join(" ");

function AffinitySlider(props: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const { t } = useI18n();
  const [lo, setLo] = createSignal(props.min);
  const [hi, setHi] = createSignal(props.max);
  createEffect(() => setLo(props.min));
  createEffect(() => setHi(props.max));

  const commit = () => props.onChange(lo(), hi());
  const lPct = () => `${(lo() / AFFINITY_MAX) * 100}%`;
  const rPct = () => `${100 - (hi() / AFFINITY_MAX) * 100}%`;
  // Raise min above max when they're close so the user can always grab min and drag left
  const minOnTop = () => lo() >= hi() - 5;

  return (
    <div>
      <span class="text-xs text-muted font-medium">{t("connection.closeness")}</span>
      <div class="mt-3">
        <div class="relative h-5 mx-[7px]">
          <div class="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] rounded-full bg-elevated pointer-events-none" />
          <div
            class="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-accent pointer-events-none"
            style={{ left: lPct(), right: rPct() }}
          />
          <input
            type="range" min={0} max={AFFINITY_MAX} step={1} value={lo()}
            onInput={(e) => {
              const clamped = Math.min(Number(e.currentTarget.value), hi());
              e.currentTarget.value = String(clamped);
              setLo(clamped);
            }}
            onPointerUp={commit}
            class={THUMB_CLS}
            style={{ "z-index": minOnTop() ? 20 : 10 }}
          />
          <input
            type="range" min={0} max={AFFINITY_MAX} step={1} value={hi()}
            onInput={(e) => {
              const clamped = Math.max(Number(e.currentTarget.value), lo());
              e.currentTarget.value = String(clamped);
              setHi(clamped);
            }}
            onPointerUp={commit}
            class={THUMB_CLS}
            style={{ "z-index": minOnTop() ? 10 : 20 }}
          />
        </div>
        <div class="relative h-4 mt-1 mx-[7px]">
          <span class="absolute left-0 text-[10px] text-muted">{t("connection.aff_me")}</span>
          <span class="absolute left-[25%] -translate-x-1/2 text-[10px] text-muted">{t("connection.aff_family")}</span>
          <span class="absolute left-1/2 -translate-x-1/2 text-[10px] text-muted">{t("connection.aff_friends")}</span>
          <span class="absolute left-[75%] -translate-x-1/2 text-[10px] text-muted">{t("connection.aff_acquaintances")}</span>
          <span class="absolute right-0 text-[10px] text-muted">{t("connection.aff_all")}</span>
        </div>
      </div>
    </div>
  );
}

export default function StreamFiltersWidget() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [folders] = createQueryResource("network-folders", fetchFolders);

  const installedApps = useInstalledApps();
  const privacyGroupsInstalled = () => installedApps().has("Privacy Groups");
  const affinityInstalled = () => installedApps().has("Affinity Tool");
  const [privacyGroups] = createQueryResource(
    "privacy-groups",
    () => privacyGroupsInstalled() || null,
    (): Promise<PrivacyGroup[]> => fetchGroups(),
  );

  const tag    = () => str(searchParams.tag);
  const file   = () => str(searchParams.file);
  const dbegin = () => str(searchParams.dbegin);
  const dend   = () => str(searchParams.dend);
  const cmin   = () => str(searchParams.cmin);
  const cmax   = () => str(searchParams.cmax);

  const [folderOpen,    setFolderOpen]    = createSignal(!!str(searchParams.file));
  const [groupsOpen,    setGroupsOpen]    = createSignal(!!str(searchParams.gid));
  const [tagOpen,       setTagOpen]       = createSignal(!!str(searchParams.tag));
  const [dateOpen,      setDateOpen]      = createSignal(!!(str(searchParams.dbegin) || str(searchParams.dend)));
  const [affinityOpen,  setAffinityOpen]  = createSignal(!!(str(searchParams.cmin) || str(searchParams.cmax)));

  createEffect(() => { if (file())                                    setFolderOpen(true); });
  createEffect(() => { if (str(searchParams.gid))                     setGroupsOpen(true); });
  createEffect(() => { if (tag())                                      setTagOpen(true); });
  createEffect(() => { if (dbegin() || dend())                         setDateOpen(true); });
  createEffect(() => { if (cmin() || cmax())                           setAffinityOpen(true); });

  function sp(overrides: Record<string, string | undefined>) {
    setSearchParams({ ...overrides }, { replace: true });
  }

  const hasAnyFilter = () =>
    (str(searchParams.order) || "created") !== "created" || !!searchParams.search ||
    searchParams.star === "1" || searchParams.pf === "1" ||
    searchParams.conv === "1" || searchParams.dm === "1" || searchParams.event === "1" || searchParams.poll === "1" ||
    !!(tag() || file() || dbegin() || dend() || cmin() || cmax()) ||
    !!(searchParams.cid || searchParams.gid);

  function applyNow() {
    resetPosts();
    loadNetwork(parseNetworkParams(searchParams));
  }

  function clearAll() {
    setSearchParams(
      {
        order: undefined, search: undefined, tag: undefined, file: undefined,
        star: undefined, pf: undefined, conv: undefined, dm: undefined, event: undefined, poll: undefined,
        dbegin: undefined, dend: undefined,
        cmin: undefined, cmax: undefined,
        cid: undefined, gid: undefined, xchan_label: undefined,
      },
      { replace: true },
    );
    setTimeout(applyNow, 0);
  }

  function toggle(key: string) {
    const current = searchParams[key] === "1";
    setSearchParams({ [key]: current ? undefined : "1" }, { replace: true });
    setTimeout(applyNow, 0);
  }

  return (
    <div class="bg-surface border border-rim rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-rim flex items-center justify-between">
        <h2 class="text-sm font-semibold text-txt">{t("network.filters")}</h2>
        <Show when={hasAnyFilter()}>
          <button onClick={clearAll} title={t("network.clear_filters")}
            class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted
                   hover:text-accent hover:bg-elevated transition-colors">
            <MdFillClose size={12} />
            <span>{t("network.clear_filters")}</span>
          </button>
        </Show>
      </div>
      <div class="px-3 py-2 space-y-1">
        <For each={CHIPS}>
          {(chip) => {
            const active = () => searchParams[chip.key] === "1";
            return (
              <button
                onClick={() => toggle(chip.key)}
                class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                       transition-colors text-left"
                classList={{
                  "bg-accent-muted text-accent font-medium": active(),
                  "text-muted hover:bg-elevated hover:text-txt": !active(),
                }}
              >
                <chip.Icon size={15} class="shrink-0" />
                <span>{t(chip.labelKey as any)}</span>
              </button>
            );
          }}
        </For>

        <Show when={!folders.loading && (folders() ?? []).length > 0}>
          <div>
            <button
              onClick={() => setFolderOpen((o) => !o)}
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                     transition-colors text-left text-muted hover:bg-elevated hover:text-txt"
            >
              <MdFillFolder size={15} class="shrink-0" />
              <span class="flex-1">{t("network.folder")}</span>
              <Show when={!!file()}>
                <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              </Show>
              <Show
                when={folderOpen()}
                fallback={<MdFillKeyboard_arrow_right size={15} class="shrink-0" />}
              >
                <MdFillKeyboard_arrow_down size={15} class="shrink-0" />
              </Show>
            </button>
            <Show when={folderOpen()}>
              <div class="pl-6 pt-1 pb-0.5 flex flex-wrap gap-1.5">
                <button
                  onClick={() => { sp({ file: undefined }); setTimeout(applyNow, 0); }}
                  class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
                  classList={{
                    "bg-accent text-accent-fg font-medium": !file(),
                    "bg-elevated text-muted hover:text-txt": !!file(),
                  }}
                >
                  {t("network.folder_all")}
                </button>
                <For each={folders() ?? []}>
                  {(folder) => (
                    <button
                      onClick={() => { sp({ file: folder }); setTimeout(applyNow, 0); }}
                      class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"
                      classList={{
                        "bg-accent text-accent-fg font-medium": file() === folder,
                        "bg-elevated text-muted hover:text-txt": file() !== folder,
                      }}
                    >
                      <MdFillFolder size={11} class="shrink-0" />
                      <span class="truncate max-w-[120px]">{folder}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={privacyGroupsInstalled() && !privacyGroups.loading && (privacyGroups() ?? []).length > 0}>
          <div>
            <button
              onClick={() => setGroupsOpen((o) => !o)}
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                     transition-colors text-left text-muted hover:bg-elevated hover:text-txt"
            >
              <MdFillGroup size={15} class="shrink-0" />
              <span class="flex-1">{t("network.privacy_groups")}</span>
              <Show when={!!str(searchParams.gid)}>
                <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              </Show>
              <Show
                when={groupsOpen()}
                fallback={<MdFillKeyboard_arrow_right size={15} class="shrink-0" />}
              >
                <MdFillKeyboard_arrow_down size={15} class="shrink-0" />
              </Show>
            </button>
            <Show when={groupsOpen()}>
              <div class="pl-6 pt-1 pb-0.5 space-y-0.5">
                <button
                  onClick={() => { sp({ gid: undefined, xchan_label: undefined }); setTimeout(applyNow, 0); }}
                  class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left"
                  classList={{
                    "bg-accent text-accent-fg font-medium": !str(searchParams.gid),
                    "text-muted hover:bg-elevated hover:text-txt": !!str(searchParams.gid),
                  }}
                >
                  {t("network.folder_all")}
                </button>
                <For each={privacyGroups() ?? []}>
                  {(group) => {
                    const active = () => str(searchParams.gid) === String(group.id);
                    return (
                      <button
                        onClick={() => {
                          sp({ gid: String(group.id), xchan_label: group.name, cid: undefined });
                          setTimeout(applyNow, 0);
                        }}
                        class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left"
                        classList={{
                          "bg-accent-muted text-accent font-medium": active(),
                          "text-muted hover:bg-elevated hover:text-txt": !active(),
                        }}
                      >
                        <MdFillGroup size={13} class="shrink-0" />
                        <span class="truncate">{group.name}</span>
                      </button>
                    );
                  }}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        {/* Tag */}
        <div>
          <button
            onClick={() => setTagOpen((o) => !o)}
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                   transition-colors text-left text-muted hover:bg-elevated hover:text-txt"
          >
            <MdFillTag size={15} class="shrink-0" />
            <span class="flex-1">{t("network.tag")}</span>
            <Show when={!!tag()}>
              <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            </Show>
            <Show when={tagOpen()} fallback={<MdFillKeyboard_arrow_right size={15} class="shrink-0" />}>
              <MdFillKeyboard_arrow_down size={15} class="shrink-0" />
            </Show>
          </button>
          <Show when={tagOpen()}>
            <div class="pl-6 pr-2 pt-1 pb-1">
              <input
                type="text"
                placeholder={t("network.tag_placeholder")}
                value={tag()}
                onInput={(e) => sp({ tag: e.currentTarget.value || undefined })}
                onBlur={applyNow}
                onKeyDown={(e) => e.key === "Enter" && applyNow()}
                class={INPUT_CLS}
              />
            </div>
          </Show>
        </div>

        {/* Date range */}
        <div>
          <button
            onClick={() => setDateOpen((o) => !o)}
            class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                   transition-colors text-left text-muted hover:bg-elevated hover:text-txt"
          >
            <MdFillDate_range size={15} class="shrink-0" />
            <span class="flex-1">{t("network.date_range")}</span>
            <Show when={!!(dbegin() || dend())}>
              <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            </Show>
            <Show when={dateOpen()} fallback={<MdFillKeyboard_arrow_right size={15} class="shrink-0" />}>
              <MdFillKeyboard_arrow_down size={15} class="shrink-0" />
            </Show>
          </button>
          <Show when={dateOpen()}>
            <div class="pl-6 pr-2 pt-1 pb-1 space-y-2">
              <label class="flex flex-col gap-1">
                <span class="text-xs text-muted">{t("network.date_from")}</span>
                <input type="date" value={dbegin()}
                  onChange={(e) => { sp({ dbegin: e.currentTarget.value || undefined }); setTimeout(applyNow, 0); }}
                  class={INPUT_CLS} />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-xs text-muted">{t("network.date_to")}</span>
                <input type="date" value={dend()}
                  onChange={(e) => { sp({ dend: e.currentTarget.value || undefined }); setTimeout(applyNow, 0); }}
                  class={INPUT_CLS} />
              </label>
            </div>
          </Show>
        </div>

        {/* Closeness / Affinity — only when the Affinity Tool app is installed */}
        <Show when={affinityInstalled()}>
          <div>
            <button
              onClick={() => setAffinityOpen((o) => !o)}
              class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm
                     transition-colors text-left text-muted hover:bg-elevated hover:text-txt"
            >
              <MdFillPeople size={15} class="shrink-0" />
              <span class="flex-1">{t("connection.closeness")}</span>
              <Show when={!!(cmin() || cmax())}>
                <span class="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              </Show>
              <Show when={affinityOpen()} fallback={<MdFillKeyboard_arrow_right size={15} class="shrink-0" />}>
                <MdFillKeyboard_arrow_down size={15} class="shrink-0" />
              </Show>
            </button>
            <Show when={affinityOpen()}>
              <div class="pl-4 pr-2 pt-2 pb-2">
                <AffinitySlider
                  min={cmin() ? Number(cmin()) : 0}
                  max={cmax() ? Number(cmax()) : AFFINITY_MAX}
                  onChange={(min, max) => {
                    const isDefault = min === 0 && max === AFFINITY_MAX;
                    sp({
                      cmin: isDefault ? undefined : String(min),
                      cmax: isDefault ? undefined : String(max),
                    });
                    setTimeout(applyNow, 0);
                  }}
                />
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
