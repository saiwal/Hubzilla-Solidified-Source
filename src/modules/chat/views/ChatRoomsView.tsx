// src/modules/chat/views/ChatRoomsView.tsx
import {
  createEffect,
  Show,
  For,
  createSignal,
  on,
} from "solid-js";
import { useI18n } from "@/i18n";
import { useNavigate, useParams } from "@solidjs/router";
import { usePageNick } from "@/shared/store/site-config";
import {
  rooms,
  roomsLoading,
  isOwner,
  chatroomsInstalled,
  loadRooms,
  createChatRoom,
  deleteChatRoom,
} from "../store";
import {
  MdFillChat,
  MdFillAdd,
  MdFillPeople,
  MdFillDelete,
  MdFillSchedule,
  MdOutlineTimer,
} from "solid-icons/md";
import formatPostDate from "@/shared/lib/date";
import AclPicker, { entryKey, type AclMode, type AclEntry } from "@/shared/editor/components/AclPicker";

function formatExpiry(minutes: number, neverLabel: string, expiresLabel: string): string {
  if (minutes === 0) return neverLabel;
  if (minutes < 60) return `${expiresLabel} ${minutes}m`;
  if (minutes < 1440) return `${expiresLabel} ${Math.round(minutes / 60)}h`;
  return `${expiresLabel} ${Math.round(minutes / 1440)}d`;
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function ChatRoomsView() {
  const params = useParams<{ nick: string }>();
  const navigate = useNavigate();
  const pageNick = usePageNick();
  const { t } = useI18n();

  const nick = () => params.nick || pageNick();

  const [showForm, setShowForm] = createSignal(false);
  const [newName, setNewName] = createSignal("");
  const [newExpire, setNewExpire] = createSignal(120);
  const [aclMode, setAclMode] = createSignal<AclMode>("public");
  const [allowEntries, setAllowEntries] = createSignal<Set<string>>(new Set<string>());
  const [denyEntries, setDenyEntries] = createSignal<Set<string>>(new Set<string>());
  const [creating, setCreating] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);

  createEffect(on(nick, (n) => {
    if (n) loadRooms(n);
  }));

  function toggleEntry(entry: AclEntry, list: "allow" | "deny") {
    const key = entryKey(entry);
    const [getSet, setSet] = list === "allow"
      ? [allowEntries, setAllowEntries]
      : [denyEntries, setDenyEntries];
    const setOther = list === "allow" ? setDenyEntries : setAllowEntries;
    void getSet();
    setSet((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
    setOther((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }

  function clearEntries() {
    setAllowEntries(new Set<string>());
    setDenyEntries(new Set<string>());
  }

  function splitEntries(entries: Set<string>): { cids: string[]; gids: string[] } {
    const cids: string[] = [];
    const gids: string[] = [];
    for (const key of entries) {
      const colon = key.indexOf(":");
      const type = key.slice(0, colon);
      const xid  = key.slice(colon + 1);
      if (type === "c") cids.push(xid);
      else if (type === "g") gids.push(xid);
    }
    return { cids, gids };
  }

  function resetForm() {
    setNewName("");
    setNewExpire(120);
    setAclMode("public");
    clearEntries();
    setFormError(null);
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    const name = newName().trim();
    if (!name) return;

    const { cids: allowCids, gids: allowGids } = splitEntries(allowEntries());
    const { cids: denyCids, gids: denyGids } = splitEntries(denyEntries());

    if (aclMode() === "custom" && allowCids.length === 0 && allowGids.length === 0) {
      setFormError(t("chat.private_select_hint") as string);
      return;
    }

    setCreating(true);
    setFormError(null);
    try {
      const room = await createChatRoom(nick(), {
        name,
        expire: newExpire(),
        visibility: aclMode(),
        allow_cid: allowCids,
        allow_gid: allowGids,
        deny_cid: denyCids,
        deny_gid: denyGids,
      });
      setShowForm(false);
      resetForm();
      navigate(`/chat/${nick()}/${room.id}`);
    } catch (err: any) {
      setFormError(err.message ?? "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  async function handleDrop(roomId: number, name: string) {
    if (!confirm(`Delete chatroom "${name}"?`)) return;
    await deleteChatRoom(nick(), roomId);
  }

  return (
    <div class="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <MdFillChat class="text-accent text-xl" />
          <h1 class="text-lg font-semibold text-txt">{t("chat.chatrooms")}</h1>
        </div>
        <Show when={isOwner()}>
          <button
            onClick={() => { setShowForm((v) => !v); if (showForm()) resetForm(); }}
            class="flex items-center gap-1.5 text-sm border border-rim text-muted hover:bg-elevated hover:text-txt rounded-lg px-3 py-1.5 transition-colors"
          >
            <MdFillAdd class="text-base" />
            {t("chat.new_room")}
          </button>
        </Show>
      </div>

      {/* Create form */}
      <Show when={showForm()}>
        <form
          onSubmit={handleCreate}
          class="bg-surface border border-rim rounded-xl p-4 space-y-4"
        >
          <h2 class="text-sm font-medium text-txt">{t("chat.new_chatroom")}</h2>

          {/* Name */}
          <input
            type="text"
            placeholder={t("chat.room_name_placeholder") as string}
            value={newName()}
            onInput={(e) => setNewName(e.currentTarget.value)}
            class="w-full bg-surface border border-rim text-txt text-sm rounded-lg px-3 py-2 hover:border-rim-strong focus:outline-none focus:border-accent transition-colors"
            required
          />

          {/* Expiry */}
          <div class="flex items-center gap-2">
            <label class="text-xs text-muted shrink-0">{t("chat.expire_after")}</label>
            <input
              type="number"
              min="0"
              max="10080"
              value={newExpire()}
              onInput={(e) => setNewExpire(parseInt(e.currentTarget.value) || 0)}
              class="w-24 bg-surface border border-rim text-txt text-sm rounded-lg px-3 py-1.5 hover:border-rim-strong focus:outline-none focus:border-accent transition-colors"
            />
            <span class="text-xs text-muted">{t("chat.minutes_never")}</span>
          </div>

          {/* ACL */}
          <div class="space-y-2">
            <p class="text-xs font-medium text-muted">{t("chat.visibility")}</p>
            <AclPicker
              mode={aclMode()}
              onModeChange={setAclMode}
              allowEntries={allowEntries()}
              denyEntries={denyEntries()}
              onToggle={toggleEntry}
              onClear={clearEntries}
            />
            <p class="text-[11px] text-muted">
              {aclMode() === "public" && t("chat.visibility_public")}
              {aclMode() === "connections" && t("chat.visibility_connections")}
              {aclMode() === "custom" && t("chat.visibility_private")}
            </p>
          </div>

          <Show when={formError()}>
            <p class="text-xs text-red-500">{formError()}</p>
          </Show>

          <div class="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              class="text-sm border border-rim text-muted hover:bg-elevated rounded-lg px-3 py-1.5 transition-colors"
            >
              {t("chat.cancel")}
            </button>
            <button
              type="submit"
              disabled={creating()}
              class="text-sm bg-accent text-accent-fg rounded-lg px-4 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating() ? t("chat.creating") : t("chat.create")}
            </button>
          </div>
        </form>
      </Show>

      {/* App not installed */}
      <Show when={!chatroomsInstalled() && !roomsLoading()}>
        <div class="bg-surface border border-rim rounded-xl p-8 text-center space-y-2">
          <MdFillChat class="text-3xl text-muted mx-auto" />
          <p class="text-sm text-muted">{t("chat.not_installed")}</p>
        </div>
      </Show>

      {/* Loading */}
      <Show when={roomsLoading()}>
        <div class="space-y-3">
          <For each={[0, 1, 2]}>
            {() => (
              <div class="bg-surface border border-rim rounded-xl p-4 h-16 animate-pulse" />
            )}
          </For>
        </div>
      </Show>

      {/* Empty */}
      <Show when={!roomsLoading() && chatroomsInstalled() && rooms().length === 0}>
        <div class="bg-surface border border-rim rounded-xl p-8 text-center space-y-2">
          <MdFillChat class="text-3xl text-muted mx-auto" />
          <p class="text-sm text-muted">{t("chat.no_chatrooms")}</p>
          <Show when={isOwner()}>
            <p class="text-xs text-muted">{t("chat.create_hint")}</p>
          </Show>
        </div>
      </Show>

      {/* Room list */}
      <Show when={!roomsLoading() && rooms().length > 0}>
        <div class="space-y-2">
          <For each={rooms()}>
            {(room) => (
              <div class="bg-surface border border-rim rounded-xl p-4 flex items-center gap-3 hover:bg-elevated transition-colors group">
                <button
                  onClick={() => navigate(`/chat/${nick()}/${room.id}`)}
                  class="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <div class="w-9 h-9 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
                    <MdFillChat class="text-accent text-base" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-txt truncate">{room.name}</p>
                    <div class="flex items-center gap-3 mt-0.5">
                      <span class="flex items-center gap-1 text-xs text-muted">
                        <MdFillPeople class="text-sm" />
                        {room.in_room} {t("chat.online")}
                      </span>
                      <Show when={room.last_msg}>
                        <span class="flex items-center gap-1 text-xs text-muted">
                          <MdFillSchedule class="text-sm" />
                          {formatPostDate(room.last_msg!)}
                        </span>
                      </Show>
                      <span class="flex items-center gap-1 text-xs text-muted">
                        <MdOutlineTimer class="text-sm" />
                        {formatExpiry(room.expire, t("chat.expire_never") as string, t("chat.expire_label") as string)}
                      </span>
                    </div>
                  </div>
                </button>
                <Show when={isOwner()}>
                  <button
                    onClick={() => handleDrop(room.id, room.name)}
                    class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-elevated transition-all"
                    title={t("chat.delete_room") as string}
                  >
                    <MdFillDelete class="text-base" />
                  </button>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
