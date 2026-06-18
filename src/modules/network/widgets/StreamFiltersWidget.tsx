import { useSearchParams } from "@solidjs/router";
import {
  MdFillStar,
  MdFillNotifications,
  MdFillPerson,
  MdFillMail,
  MdFillEvent,
  MdFillClose,
  MdFillFolder,
} from "solid-icons/md";
import { createSignal, createEffect, createResource, For, Show } from "solid-js";
import { useI18n } from "@/i18n";
import { loadNetwork, resetPosts } from "../store";
import { fetchFolders, type NetworkParams } from "../api";

const CHIPS = [
  { key: "star",  labelKey: "network.starred",         Icon: MdFillStar          },
  { key: "pf",   labelKey: "network.following",        Icon: MdFillNotifications },
  { key: "conv", labelKey: "network.conversations",    Icon: MdFillPerson        },
  { key: "dm",   labelKey: "network.direct_messages",  Icon: MdFillMail          },
  { key: "event",labelKey: "network.events",           Icon: MdFillEvent         },
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

function buildParams(params: Record<string, string | string[] | undefined>): NetworkParams {
  const p: NetworkParams = {};
  if (params.order && params.order !== "created") p.order = params.order as NetworkParams["order"];
  if (params.search) p.search = String(params.search);
  if (params.tag)    p.tag    = String(params.tag);
  if (params.file)   p.file   = String(params.file);
  if (params.star  === "1") p.star  = 1;
  if (params.pf    === "1") p.pf    = 1;
  if (params.conv  === "1") p.conv  = 1;
  if (params.dm    === "1") p.dm    = 1;
  if (params.event === "1") p.event = 1;
  if (params.dbegin) p.dbegin = String(params.dbegin);
  if (params.dend)   p.dend   = String(params.dend);
  if (params.cmin)   p.cmin   = Number(params.cmin);
  if (params.cmax)   p.cmax   = Number(params.cmax);
  if (params.cid)    p.cid    = Number(params.cid);
  if (params.gid)    p.gid    = Number(params.gid);
  return p;
}

export default function StreamFiltersWidget() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [folders] = createResource(fetchFolders);

  const tag    = () => str(searchParams.tag);
  const file   = () => str(searchParams.file);
  const dbegin = () => str(searchParams.dbegin);
  const dend   = () => str(searchParams.dend);
  const cmin   = () => str(searchParams.cmin);
  const cmax   = () => str(searchParams.cmax);

  function sp(overrides: Record<string, string | undefined>) {
    setSearchParams({ ...overrides }, { replace: true });
  }

  const hasAnyFilter = () =>
    (str(searchParams.order) || "created") !== "created" || !!searchParams.search ||
    searchParams.star === "1" || searchParams.pf === "1" ||
    searchParams.conv === "1" || searchParams.dm === "1" || searchParams.event === "1" ||
    !!(tag() || file() || dbegin() || dend() || cmin() || cmax()) ||
    !!(searchParams.cid || searchParams.gid);

  function applyNow() {
    resetPosts();
    loadNetwork(buildParams(searchParams));
  }

  function clearAll() {
    setSearchParams(
      {
        order: undefined, search: undefined, tag: undefined, file: undefined,
        star: undefined, pf: undefined, conv: undefined, dm: undefined, event: undefined,
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
        <h3 class="text-sm font-semibold text-txt">{t("network.filters")}</h3>
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
      </div>
      <Show when={!folders.loading && (folders() ?? []).length > 0}>
        <div class="px-3 pb-2 pt-2 border-t border-rim">
          <span class="text-xs text-muted font-medium block mb-1.5">{t("network.folder")}</span>
          <div class="flex flex-wrap gap-1.5">
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
        </div>
      </Show>
      <div class="px-3 pb-3 pt-1 border-t border-rim space-y-2.5">
        <label class="flex flex-col gap-1">
          <span class="text-xs text-muted font-medium">{t("network.tag")}</span>
          <input
            type="text"
            placeholder={t("network.tag_placeholder")}
            value={tag()}
            onInput={(e) => sp({ tag: e.currentTarget.value || undefined })}
            onBlur={applyNow}
            onKeyDown={(e) => e.key === "Enter" && applyNow()}
            class={INPUT_CLS}
          />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-muted font-medium">{t("network.date_from")}</span>
          <input type="date" value={dbegin()}
            onChange={(e) => { sp({ dbegin: e.currentTarget.value || undefined }); setTimeout(applyNow, 0); }}
            class={INPUT_CLS} />
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs text-muted font-medium">{t("network.date_to")}</span>
          <input type="date" value={dend()}
            onChange={(e) => { sp({ dend: e.currentTarget.value || undefined }); setTimeout(applyNow, 0); }}
            class={INPUT_CLS} />
        </label>
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
    </div>
  );
}
