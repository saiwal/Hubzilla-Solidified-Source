import { Show, For } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { usePageNick } from "@/shared/store/site-config";
import { apiFetch } from "@/shared/lib/fetch";
import { useI18n } from "@/i18n";

interface ChannelConn {
  name: string;
  address: string;
  photo: string;
  url: string;
  local_nick: string | null;
}

interface ConnectionsData {
  connections: ChannelConn[];
  total: number;
  hidden: boolean;
}

async function fetchConnections(nick: string): Promise<ConnectionsData | null> {
  if (!nick) return null;
  const res = await apiFetch(`/api/profile/${nick}/connections?limit=24`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as ConnectionsData;
}

export default function ChannelConnectionsWidget() {
  const nick = usePageNick();
  const { t } = useI18n();

  const [data] = createQueryResource("channel-connections", () => nick(), fetchConnections);

  const conns = () => data()?.connections ?? [];
  const total = () => data()?.total ?? 0;

  return (
    <Show when={!data.loading && !data()?.hidden && conns().length > 0}>
      <div class="rounded-xl bg-surface border border-rim p-3">
        <div class="flex items-center justify-between mb-2.5">
          <h3 class="text-xs font-semibold text-muted uppercase tracking-wide">
            {t("widgets.connections")}
          </h3>
          <Show when={total() > conns().length}>
            <span class="text-xs text-muted">{total()}</span>
          </Show>
        </div>

        <div class="grid grid-cols-4 gap-1.5">
          <For each={conns()}>
            {(conn) => {
              const href = conn.local_nick
                ? `/channel/${conn.local_nick}`
                : conn.url;
              return (
                <a href={href} title={conn.name} class="group flex flex-col items-center gap-0.5">
                  <img
                    src={conn.photo}
                    alt={conn.name}
                    class="w-11 h-11 rounded-full object-cover ring-1 ring-rim group-hover:ring-2 group-hover:ring-accent transition-all"
                  />
                  <span class="text-[10px] text-muted leading-tight text-center w-full truncate group-hover:text-txt transition-colors">
                    {conn.name}
                  </span>
                </a>
              );
            }}
          </For>
        </div>

        <Show when={total() > conns().length}>
          <div class="mt-2.5 text-center">
            <a
              href="/directory/connections"
              class="text-xs text-accent hover:underline"
            >
              {t("widgets.view_all")} ({total()})
            </a>
          </div>
        </Show>
      </div>
    </Show>
  );
}
