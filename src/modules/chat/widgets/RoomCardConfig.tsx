// Settings form for RoomCardWidget instances: pick one of the channel's
// chatrooms.

import { createSignal, For } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import { fetchRooms } from "../api";

export default function RoomCardConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const [room, setRoom] = createSignal(String(props.config.room ?? ""));

  const [rooms] = createQueryResource(
    "chat-rooms",
    () => nick() || null,
    async (n) => (await fetchRooms(n)).rooms,
  );

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_room")}
        <select
          value={room()}
          onChange={(e) => setRoom(e.currentTarget.value)}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        >
          <option value="">—</option>
          <For each={rooms() ?? []}>
            {(r) => <option value={String(r.id)}>{r.name}</option>}
          </For>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ room: Number(room()) })}
        disabled={!room()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
