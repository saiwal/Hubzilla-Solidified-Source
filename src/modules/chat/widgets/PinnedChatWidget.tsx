// src/modules/chat/widgets/PinnedChatWidget.tsx
import {
  For, Show, createSignal, createEffect, on, onCleanup,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import { MdFillLock, MdFillLock_open } from "solid-icons/md";
import { useI18n } from "@/i18n";
import { fetchMessages, sendMessage } from "../api";
import type { ChatMessage } from "../api";
import { pinnedRooms, unpinRoom, type PinnedRoom } from "../store";

function stripBBCode(body: string): string {
  return body.replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim();
}

function isRestricted(room: PinnedRoom): boolean {
  const acl = room.acl;
  if (!acl) return false;
  return (
    acl.allow_cid.length > 0 || acl.allow_gid.length > 0 ||
    acl.deny_cid.length  > 0 || acl.deny_gid.length  > 0
  );
}

// ── Single accordion panel ────────────────────────────────────────────────────

function PinnedRoomPanel(props: { room: PinnedRoom; onUnpin: () => void }) {
  const navigate = useNavigate();
  const { t }    = useI18n();

  const [open,     setOpen]     = createSignal(false);
  const [msgs,     setMsgs]     = createSignal<ChatMessage[]>([]);
  const [loading,  setLoading]  = createSignal(false);
  const [text,     setText]     = createSignal("");
  const [sending,  setSending]  = createSignal(false);

  let msgsEl: HTMLDivElement | undefined;
  let timer: ReturnType<typeof setInterval> | null = null;

  async function load() {
    try {
      const data = await fetchMessages(props.room.nick, props.room.roomId, undefined, 20);
      setMsgs(data.messages);
    } catch {}
  }

  function scrollBottom() {
    requestAnimationFrame(() => { if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight; });
  }

  createEffect(on(msgs, scrollBottom, { defer: true }));

  createEffect(on(open, async (isOpen) => {
    if (isOpen) {
      setLoading(true);
      await load();
      setLoading(false);
      timer = setInterval(load, 5000);
    } else {
      if (timer !== null) { clearInterval(timer); timer = null; }
    }
  }));

  onCleanup(() => { if (timer !== null) clearInterval(timer); });

  async function send() {
    const body = text().trim();
    if (!body || sending()) return;
    setSending(true);
    try {
      await sendMessage(props.room.nick, props.room.roomId, body);
      setText("");
      await load();
    } catch {}
    setSending(false);
  }

  const restricted = () => isRestricted(props.room);

  return (
    <div class="border-b border-rim last:border-0">
      {/* Accordion header */}
      <div class="flex items-center gap-1.5 px-3 py-2.5 hover:bg-elevated group transition-colors">
        <button
          class="flex-1 flex items-center gap-2 text-left min-w-0"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            class="w-3 h-3 text-muted shrink-0 transition-transform"
            classList={{ "rotate-90": open() }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>

          <span class="text-xs font-medium text-txt truncate">{props.room.name}</span>

          <span
            class={`flex items-center gap-0.5 text-[10px] shrink-0 ${
              restricted() ? "text-accent" : "text-green-600 dark:text-green-400"
            }`}
          >
            <Show when={restricted()} fallback={<MdFillLock_open size={9} />}>
              <MdFillLock size={9} />
            </Show>
          </span>
        </button>

        <button
          onClick={() => navigate(`/chat/${props.room.nick}/${props.room.roomId}`)}
          title="Open chatroom"
          class="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-accent transition-all shrink-0"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>

        <button
          onClick={props.onUnpin}
          title={t("chat.unpin") as string}
          class="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-red-500 transition-all shrink-0"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Accordion body */}
      <Show when={open()}>
        <div class="border-t border-rim bg-elevated/30">
          {/* Messages */}
          <Show when={loading()}>
            <div class="px-3 py-3 space-y-1.5 animate-pulse">
              <For each={[1, 2, 3]}>
                {() => <div class="h-2.5 bg-elevated rounded" style="width: 70%" />}
              </For>
            </div>
          </Show>

          <Show when={!loading()}>
            <div
              ref={msgsEl}
              class="max-h-36 overflow-y-auto px-3 py-2 space-y-1"
            >
              <Show when={msgs().length === 0}>
                <p class="text-[11px] text-muted text-center py-3">{t("chat.no_messages")}</p>
              </Show>
              <For each={msgs()}>
                {(msg) => (
                  <p class="text-[11px] text-txt leading-snug">
                    <span class="font-semibold text-accent">{msg.author_name}: </span>
                    {stripBBCode(msg.body)}
                  </p>
                )}
              </For>
            </div>

            {/* Send bar */}
            <div class="flex gap-1.5 px-2 pb-2 pt-1 border-t border-rim">
              <input
                type="text"
                value={text()}
                onInput={(e) => setText(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                }}
                placeholder={t("chat.write_message") as string}
                class="flex-1 text-[11px] bg-surface border border-rim rounded-lg px-2 py-1 text-txt placeholder:text-muted focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => void send()}
                disabled={!text().trim() || sending()}
                class="px-2 py-1 bg-accent text-accent-fg text-xs rounded-lg disabled:opacity-40 transition-opacity shrink-0"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ── Widget shell ──────────────────────────────────────────────────────────────

export default function PinnedChatWidget() {
  const { t } = useI18n();
  const rooms  = () => pinnedRooms();

  return (
    <Show when={rooms().length > 0}>
      <div class="bg-surface border border-rim rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div class="px-4 pt-3.5 pb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
          <h3 class="text-sm font-semibold text-txt flex-1">{t("chat.pinned_chats")}</h3>
          <span class="text-xs text-muted tabular-nums">{rooms().length}</span>
        </div>

        {/* Accordion rooms */}
        <For each={rooms()}>
          {(room) => (
            <PinnedRoomPanel
              room={room}
              onUnpin={() => unpinRoom(room.nick, room.roomId)}
            />
          )}
        </For>
      </div>
    </Show>
  );
}
