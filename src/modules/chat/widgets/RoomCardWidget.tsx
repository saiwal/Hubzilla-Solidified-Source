// Chatroom card (config: { room }): room name, who's inside, join link.
// multiInstance.

import { createResource, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { WidgetProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { editingWidgets } from "@/shared/store/widget-layout";
import { useI18n } from "@/i18n";
import { MdFillChat } from "solid-icons/md";
import { fetchRooms } from "../api";

function EditHint(props: { text: string }) {
  return (
    <Show when={editingWidgets()}>
      <div class="bg-surface border border-rim rounded-xl px-4 py-3">
        <p class="text-xs text-muted">{props.text}</p>
      </div>
    </Show>
  );
}

export default function RoomCardWidget(props: WidgetProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const roomId = () => Number(props.config?.room ?? 0);

  const [room] = createResource(
    () => (nick() && roomId() ? { nick: nick(), id: roomId() } : null),
    async (p) => {
      const res = await fetchRooms(p.nick);
      return res.rooms.find((r) => r.id === p.id) ?? null;
    },
  );

  return (
    <Show when={roomId()} fallback={<EditHint text={t("widgets.not_configured")} />}>
      <Show when={room.loading}>
        <div class="bg-surface border border-rim rounded-xl p-4 space-y-2 animate-pulse">
          <div class="h-3 bg-elevated rounded w-1/2" />
          <div class="h-3 bg-elevated rounded w-1/3" />
        </div>
      </Show>

      <Show when={!room.loading}>
        <Show when={room()} fallback={<EditHint text={t("widgets.item_unavailable")} />}>
          {(r) => (
            <div class="bg-surface border border-rim rounded-xl overflow-hidden">
              <div class="px-4 py-3 flex items-center gap-2">
                <MdFillChat size={18} class="text-accent shrink-0" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-txt truncate">{r().name}</p>
                  <p class="text-xs text-muted">
                    {r().in_room} {t("widgets.room_members")}
                  </p>
                </div>
              </div>
              <A
                href={`/chat/${nick()}/${r().id}`}
                class="block px-4 py-2 border-t border-rim text-center text-xs font-medium
                       text-accent hover:bg-elevated transition-colors"
              >
                {t("widgets.join_room")}
              </A>
            </div>
          )}
        </Show>
      </Show>
    </Show>
  );
}
