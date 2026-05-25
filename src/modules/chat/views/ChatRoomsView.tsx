// src/modules/chat/views/ChatRoomsView.tsx
import {
  createEffect,
  Show,
  For,
  createSignal,
  createResource,
  on,
} from "solid-js";
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
import { fetchAclOptions, type RoomVisibility, type AclConnection, type AclGroup } from "../api";
import {
  MdFillChat,
  MdFillAdd,
  MdFillPeople,
  MdFillDelete,
  MdFillSchedule,
  MdFillPublic,
  MdFillLock,
  MdFillGroup,
  MdFillSearch,
} from "solid-icons/md";
import formatPostDate from "@/shared/lib/date";

// ── Visibility pill component ─────────────────────────────────────────────────

function VisibilityPill(props: {
  value: RoomVisibility;
  current: RoomVisibility;
  label: string;
  icon: any;
  onClick: () => void;
}) {
  const Icon = props.icon;
  const active = () => props.value === props.current;
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all"
      classList={{
        "bg-accent text-accent-fg border-accent": active(),
        "border-rim text-muted hover:bg-elevated hover:text-txt": !active(),
      }}
    >
      <Icon class="text-sm" />
      {props.label}
    </button>
  );
}

// ── Connection/group picker for private rooms ─────────────────────────────────

function PrivatePicker(props: {
  connections: AclConnection[];
  groups: AclGroup[];
  selectedCids: Set<string>;
  selectedGids: Set<string>;
  onToggleCid: (hash: string) => void;
  onToggleGid: (hash: string) => void;
}) {
  const [query, setQuery] = createSignal("");

  const filteredConns = () => {
    const q = query().toLowerCase();
    if (!q) return props.connections;
    return props.connections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.addr.toLowerCase().includes(q)
    );
  };
  const filteredGroups = () => {
    const q = query().toLowerCase();
    if (!q) return props.groups;
    return props.groups.filter((g) => g.name.toLowerCase().includes(q));
  };

  const totalSelected = () => props.selectedCids.size + props.selectedGids.size;

  return (
    <div class="border border-rim rounded-lg overflow-hidden">
      {/* Search */}
      <div class="flex items-center gap-2 px-3 py-2 border-b border-rim bg-base">
        <MdFillSearch class="text-muted text-sm shrink-0" />
        <input
          type="text"
          placeholder="Search connections & groups…"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          class="flex-1 bg-transparent text-txt text-xs focus:outline-none placeholder:text-subtle"
        />
        <Show when={totalSelected() > 0}>
          <span class="text-[10px] text-accent font-medium">{totalSelected()} selected</span>
        </Show>
      </div>

      <div class="max-h-48 overflow-y-auto divide-y divide-rim">
        {/* Groups */}
        <Show when={filteredGroups().length > 0}>
          <div class="px-3 py-1.5 bg-elevated">
            <p class="text-[10px] font-medium text-muted uppercase tracking-wider">Privacy Groups</p>
          </div>
          <For each={filteredGroups()}>
            {(g) => {
              const selected = () => props.selectedGids.has(g.hash);
              return (
                <button
                  type="button"
                  onClick={() => props.onToggleGid(g.hash)}
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-elevated transition-colors"
                  classList={{ "bg-accent-muted": selected() }}
                >
                  <div
                    class="w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors"
                    classList={{
                      "bg-accent border-accent": selected(),
                      "border-rim": !selected(),
                    }}
                  >
                    <Show when={selected()}>
                      <span class="text-accent-fg text-[10px] font-bold">✓</span>
                    </Show>
                  </div>
                  <MdFillGroup class="text-muted text-sm shrink-0" />
                  <span class="text-xs text-txt truncate">{g.name}</span>
                </button>
              );
            }}
          </For>
        </Show>

        {/* Connections */}
        <Show when={filteredConns().length > 0}>
          <div class="px-3 py-1.5 bg-elevated">
            <p class="text-[10px] font-medium text-muted uppercase tracking-wider">Connections</p>
          </div>
          <For each={filteredConns()}>
            {(c) => {
              const selected = () => props.selectedCids.has(c.hash);
              return (
                <button
                  type="button"
                  onClick={() => props.onToggleCid(c.hash)}
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-elevated transition-colors"
                  classList={{ "bg-accent-muted": selected() }}
                >
                  <div
                    class="w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors"
                    classList={{
                      "bg-accent border-accent": selected(),
                      "border-rim": !selected(),
                    }}
                  >
                    <Show when={selected()}>
                      <span class="text-accent-fg text-[10px] font-bold">✓</span>
                    </Show>
                  </div>
                  <Show
                    when={c.avatar}
                    fallback={
                      <div class="w-5 h-5 rounded-full bg-accent-muted flex items-center justify-center shrink-0 text-[9px] text-accent font-semibold">
                        {c.name[0]?.toUpperCase() ?? "?"}
                      </div>
                    }
                  >
                    <img src={c.avatar} alt={c.name} class="w-5 h-5 rounded-full object-cover shrink-0" />
                  </Show>
                  <span class="text-xs text-txt truncate">{c.name}</span>
                  <span class="text-[10px] text-muted truncate ml-auto">{c.addr}</span>
                </button>
              );
            }}
          </For>
        </Show>

        <Show when={filteredConns().length === 0 && filteredGroups().length === 0}>
          <p class="text-xs text-muted px-3 py-4 text-center">No matches</p>
        </Show>
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function ChatRoomsView() {
  const params = useParams<{ nick: string }>();
  const navigate = useNavigate();
  const pageNick = usePageNick();

  const nick = () => params.nick || pageNick();

  const [showForm, setShowForm] = createSignal(false);
  const [newName, setNewName] = createSignal("");
  const [newExpire, setNewExpire] = createSignal(120);
  const [visibility, setVisibility] = createSignal<RoomVisibility>("public");
  const [selectedCids, setSelectedCids] = createSignal<Set<string>>(new Set());
  const [selectedGids, setSelectedGids] = createSignal<Set<string>>(new Set());
  const [creating, setCreating] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);

  // Lazy-load ACL options only when form opens and owner
  const [aclOptions] = createResource(
    () => showForm() && isOwner() ? nick() : null,
    (n) => fetchAclOptions(n),
  );

  createEffect(on(nick, (n) => {
    if (n) loadRooms(n);
  }));

  function toggleCid(hash: string) {
    setSelectedCids((prev) => {
      const next = new Set(prev);
      next.has(hash) ? next.delete(hash) : next.add(hash);
      return next;
    });
  }

  function toggleGid(hash: string) {
    setSelectedGids((prev) => {
      const next = new Set(prev);
      next.has(hash) ? next.delete(hash) : next.add(hash);
      return next;
    });
  }

  function resetForm() {
    setNewName("");
    setNewExpire(120);
    setVisibility("public");
    setSelectedCids(new Set<string>());
    setSelectedGids(new Set<string>());
    setFormError(null);
  }

  async function handleCreate(e: Event) {
    e.preventDefault();
    const name = newName().trim();
    if (!name) return;

    if (visibility() === "private" && selectedCids().size === 0 && selectedGids().size === 0) {
      setFormError("Select at least one connection or group for a private room.");
      return;
    }

    setCreating(true);
    setFormError(null);
    try {
      const room = await createChatRoom(nick(), {
        name,
        expire: newExpire(),
        visibility: visibility(),
        allow_cid: [...selectedCids()],
        allow_gid: [...selectedGids()],
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
          <h1 class="text-lg font-semibold text-txt">Chatrooms</h1>
        </div>
        <Show when={isOwner()}>
          <button
            onClick={() => { setShowForm((v) => !v); if (showForm()) resetForm(); }}
            class="flex items-center gap-1.5 text-sm border border-rim text-muted hover:bg-elevated hover:text-txt rounded-lg px-3 py-1.5 transition-colors"
          >
            <MdFillAdd class="text-base" />
            New room
          </button>
        </Show>
      </div>

      {/* Create form */}
      <Show when={showForm()}>
        <form
          onSubmit={handleCreate}
          class="bg-surface border border-rim rounded-xl p-4 space-y-4"
        >
          <h2 class="text-sm font-medium text-txt">New Chatroom</h2>

          {/* Name */}
          <input
            type="text"
            placeholder="Room name"
            value={newName()}
            onInput={(e) => setNewName(e.currentTarget.value)}
            class="w-full bg-surface border border-rim text-txt text-sm rounded-lg px-3 py-2 hover:border-rim-strong focus:outline-none focus:border-accent transition-colors"
            required
          />

          {/* Expiry */}
          <div class="flex items-center gap-2">
            <label class="text-xs text-muted shrink-0">Expire after</label>
            <input
              type="number"
              min="0"
              max="10080"
              value={newExpire()}
              onInput={(e) => setNewExpire(parseInt(e.currentTarget.value) || 0)}
              class="w-24 bg-surface border border-rim text-txt text-sm rounded-lg px-3 py-1.5 hover:border-rim-strong focus:outline-none focus:border-accent transition-colors"
            />
            <span class="text-xs text-muted">minutes (0 = never)</span>
          </div>

          {/* Visibility */}
          <div class="space-y-2">
            <p class="text-xs font-medium text-muted">Visibility</p>
            <div class="flex items-center gap-2">
              <VisibilityPill
                value="public"
                current={visibility()}
                label="Public"
                icon={MdFillPublic}
                onClick={() => setVisibility("public")}
              />
              <VisibilityPill
                value="connections"
                current={visibility()}
                label="Connections"
                icon={MdFillPeople}
                onClick={() => setVisibility("connections")}
              />
              <VisibilityPill
                value="private"
                current={visibility()}
                label="Private"
                icon={MdFillLock}
                onClick={() => setVisibility("private")}
              />
            </div>
            <p class="text-[11px] text-muted">
              {visibility() === "public" && "Anyone with chat permission can join."}
              {visibility() === "connections" && "Only your approved connections can join."}
              {visibility() === "private" && "Only the people or groups you select below can join."}
            </p>
          </div>

          {/* Private picker */}
          <Show when={visibility() === "private"}>
            <Show
              when={!aclOptions.loading && aclOptions()}
              fallback={<div class="h-16 bg-elevated rounded-lg animate-pulse" />}
            >
              <PrivatePicker
                connections={aclOptions()!.connections}
                groups={aclOptions()!.groups}
                selectedCids={selectedCids()}
                selectedGids={selectedGids()}
                onToggleCid={toggleCid}
                onToggleGid={toggleGid}
              />
            </Show>
          </Show>

          {/* Connections hint */}
          <Show when={visibility() === "connections" && aclOptions()?.default_group === ""}>
            <p class="text-[11px] text-yellow-500">
              No default privacy group set — all approved connections will be allowed.
            </p>
          </Show>

          <Show when={formError()}>
            <p class="text-xs text-red-500">{formError()}</p>
          </Show>

          <div class="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              class="text-sm border border-rim text-muted hover:bg-elevated rounded-lg px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating()}
              class="text-sm bg-accent text-accent-fg rounded-lg px-4 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating() ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </Show>

      {/* App not installed */}
      <Show when={!chatroomsInstalled() && !roomsLoading()}>
        <div class="bg-surface border border-rim rounded-xl p-8 text-center space-y-2">
          <MdFillChat class="text-3xl text-muted mx-auto" />
          <p class="text-sm text-muted">Chatrooms app is not installed for this channel.</p>
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
          <p class="text-sm text-muted">No chatrooms yet.</p>
          <Show when={isOwner()}>
            <p class="text-xs text-muted">Create one above to get started.</p>
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
                        {room.in_room} online
                      </span>
                      <Show when={room.last_msg}>
                        <span class="flex items-center gap-1 text-xs text-muted">
                          <MdFillSchedule class="text-sm" />
                          {formatPostDate(room.last_msg!)}
                        </span>
                      </Show>
                    </div>
                  </div>
                </button>
                <Show when={isOwner()}>
                  <button
                    onClick={() => handleDrop(room.id, room.name)}
                    class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-elevated transition-all"
                    title="Delete room"
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
