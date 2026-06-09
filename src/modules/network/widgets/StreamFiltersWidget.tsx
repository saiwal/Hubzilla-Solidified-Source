import { useSearchParams } from "@solidjs/router";
import {
  MdFillStar,
  MdFillNotifications,
  MdFillPerson,
  MdFillMail,
  MdFillEvent,
  MdFillClose,
} from "solid-icons/md";
import { For, Show } from "solid-js";
import { useI18n } from "@/i18n";
import { loadNetwork, resetPosts } from "../store";
import type { NetworkParams } from "../api";

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

function buildParams(params: Record<string, string | string[] | undefined>): NetworkParams {
  const p: NetworkParams = {};
  if (params.order && params.order !== "created") p.order = params.order as NetworkParams["order"];
  if (params.search) p.search = String(params.search);
  if (params.tag)    p.tag    = String(params.tag);
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

  const tag    = () => str(searchParams.tag);
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
    !!(tag() || dbegin() || dend() || cmin() || cmax()) ||
    !!(searchParams.cid || searchParams.gid);

  function applyNow() {
    resetPosts();
    loadNetwork(buildParams(searchParams));
  }

  function clearAll() {
    setSearchParams(
      {
        order: undefined, search: undefined, tag: undefined,
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
        <div class="flex gap-2">
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-muted font-medium">{t("network.affinity_min")}</span>
            <input type="number" min="0" placeholder={t("network.affinity_min_placeholder")} value={cmin()}
              onInput={(e) => sp({ cmin: e.currentTarget.value || undefined })}
              onBlur={applyNow} class={INPUT_CLS} />
          </label>
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-xs text-muted font-medium">{t("network.affinity_max")}</span>
            <input type="number" min="0" placeholder={t("network.affinity_max_placeholder")} value={cmax()}
              onInput={(e) => sp({ cmax: e.currentTarget.value || undefined })}
              onBlur={applyNow} class={INPUT_CLS} />
          </label>
        </div>
      </div>
    </div>
  );
}
