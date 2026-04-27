import {
  createSignal , onMount, onCleanup,
  For, Show, createEffect,
} from "solid-js";
import { useParams } from "@solidjs/router";
import { fetchRoom, sendMessage, enterRoom, leaveRoom } from "../api/api";
import type { ChatMessage, ChatPresence } from "../api/api";

export default function RoomView() {
  const params = useParams<{ nick: string; roomId: string }>();
  const roomId = () => Number(params.roomId);

  const [messages, setMessages] = createSignal<ChatMessage[]>([]);
  const [presence, setPresence] = createSignal<ChatPresence[]>([]);
  const [roomName, setRoomName] = createSignal("");
  const [text, setText] = createSignal("");
  const [sending, setSending] = createSignal(false);

  let listRef!: HTMLDivElement;
  let pollTimer: ReturnType<typeof setInterval>;
  let lastSince = "";

  async function poll(initial = false) {
    const data = await fetchRoom(params.nick, roomId(), initial ? undefined : lastSince || undefined);
    if (!data) return;
    if (initial) {
      setRoomName(data.room.cr_name);
      setMessages(data.messages);
    } else {
      if (data.messages.length) {
        setMessages((prev) => [...prev, ...data.messages].slice(-200));
      }
    }
    setPresence(data.presence);
    if (data.messages.length) {
      lastSince = data.messages.at(-1)!.created;
    }
  }

  onMount(async () => {
    await enterRoom(params.nick, roomId());
    await poll(true);
    // scroll to bottom
    listRef?.scrollTo({ top: listRef.scrollHeight });
    pollTimer = setInterval(() => poll(), 5000);
  });

  onCleanup(async () => {
    clearInterval(pollTimer);
    await leaveRoom(params.nick, roomId());
  });

  // auto-scroll on new messages
  createEffect(() => {
    messages(); // track
    const el = listRef;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  });

  async function send() {
    const body = text().trim();
    if (!body || sending()) return;
    setSending(true);
    const ok = await sendMessage(params.nick, roomId(), body);
    if (ok) {
      setText("");
      await poll(); // immediate refresh
    }
    setSending(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div class="flex flex-col h-full max-w-2xl mx-auto">
      <div class="flex items-center gap-3 mb-3">
        <h1 class="text-xl font-bold flex-1">{roomName()}</h1>
        <Show when={presence().length > 0}>
          <span class="text-xs text-gray-500">
            {presence().length} online
          </span>
        </Show>
      </div>

      {/* Message list */}
      <div
        ref={listRef}
        class="flex-1 overflow-y-auto space-y-3 min-h-0 bg-surface
               rounded-lg border border-rim p-4 mb-3"
      >
        <Show when={messages().length === 0}>
          <p class="text-gray-400 text-sm text-center">No messages yet.</p>
        </Show>
        <For each={messages()}>
          {(msg) => (
            <div class="flex gap-3">
              <Show when={msg.xchan_photo_s}>
                <img
                  src={msg.xchan_photo_s}
                  alt=""
                  class="w-8 h-8 rounded-full shrink-0 mt-0.5"
                />
              </Show>
              <div>
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-semibold">{msg.xchan_name}</span>
                  <span class="text-xs text-gray-400">
                    {new Date(msg.created).toLocaleTimeString()}
                  </span>
                </div>
                <p class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {msg.chat_text}
                </p>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Composer */}
      <div class="flex gap-2">
        <textarea
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={2}
          class="flex-1 px-3 py-2 text-sm rounded-lg border border-rim
                 bg-white dark:bg-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={send}
          disabled={sending() || !text().trim()}
          class="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white
                 hover:bg-blue-700 disabled:opacity-50 transition-colors self-end"
        >
          Send
        </button>
      </div>
    </div>
  );
}
