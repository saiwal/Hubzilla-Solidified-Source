import { createResource, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { fetchRooms, createRoom } from "../api/api";
import { useViewerRole } from "@/shared/store/site-config";

export default function RoomListView() {
  const params = useParams<{ nick: string }>();
  const viewerRole = useViewerRole();
  const [rooms, { refetch }] = createResource(() => params.nick, fetchRooms);

  let nameRef!: HTMLInputElement;

  async function handleCreate(e: Event) {
    e.preventDefault();
    const name = nameRef.value.trim();
    if (!name) return;
    await createRoom(params.nick, name);
    nameRef.value = "";
    refetch();
  }

  return (
    <div class="max-w-xl mx-auto space-y-4">
      <h1 class="text-2xl font-bold">Chatrooms</h1>

      <Show when={rooms.loading}>
        <p class="text-gray-500">Loading…</p>
      </Show>

      <Show when={!rooms.loading}>
        <Show when={(rooms() ?? []).length === 0}>
          <p class="text-gray-500">No chatrooms available.</p>
        </Show>
        <ul class="space-y-2">
          <For each={rooms()}>
            {(room) => (
              <li>
                <A
                  href={`/chat/${params.nick}/${room.cr_id}`}
                  class="flex items-center justify-between px-4 py-3 rounded-lg
                         bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                         hover:border-blue-400 transition-colors"
                >
                  <span class="font-medium">{room.cr_name}</span>
                  <span class="text-xs text-gray-400">
                    {room.cr_expire ? `${room.cr_expire}m expiry` : "No expiry"}
                  </span>
                </A>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <Show when={viewerRole() === "owner"}>
        <form onSubmit={handleCreate} class="flex gap-2 pt-2">
          <input
            ref={nameRef}
            type="text"
            placeholder="New room name…"
            class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                   bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Create
          </button>
        </form>
      </Show>
    </div>
  );
}
