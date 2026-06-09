import { useSearchParams } from "@solidjs/router";
import {
  MdFillStar,
  MdFillNotifications,
  MdFillPerson,
  MdFillMail,
  MdFillEvent,
} from "solid-icons/md";
import { For } from "solid-js";
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

function apply(params: Record<string, string | string[] | undefined>) {
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
  resetPosts();
  loadNetwork(p);
}

export default function StreamFiltersWidget() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  function toggle(key: string) {
    const current = searchParams[key] === "1";
    setSearchParams({ [key]: current ? undefined : "1" }, { replace: true });
    setTimeout(() => apply(searchParams), 0);
  }

  return (
    <div class="bg-surface border border-rim rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-rim">
        <h3 class="text-sm font-semibold text-txt">{t("network.filters")}</h3>
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
    </div>
  );
}
