import { createSignal, createEffect, Show, onCleanup, type JSX } from "solid-js";
import { Portal } from "solid-js/web";
import { createMediaQuery } from "@solid-primitives/media";
import { MdOutlinePerson, MdOutlinePerson_add, MdOutlineEdit, MdOutlineEmail, MdOutlineChat_bubble, MdOutlineCheck } from "solid-icons/md";
import { useAuth } from "@/shared/store/auth-store";
import { useNavViewer, useInstalledApps } from "@/shared/store/nav-store";
import { addConnection } from "@/modules/directory/people/api";
import { fetchConnectionByAddress } from "@/modules/directory/connections/api";
import type { Connection } from "@/modules/directory/connections/api";
import ConnectionEditorModal from "@/shared/views/ConnectionEditorModal";
import PostComposer from "@/shared/editor/composers/PostComposer";
import { createRoom } from "@/modules/chat/api";
import { useNavigate } from "@solidjs/router";
import { useI18n } from "@/i18n";

interface Props {
  name: string;
  avatar?: string;
  url?: string;
  address?: string;
  network?: string;
  children: JSX.Element;
}

// conn is fetched lazily after the xchan check confirms is_connected
type ConnState =
  | { tag: "idle" }
  | { tag: "loading" }
  | { tag: "connected"; conn: Connection | null }
  | { tag: "not_connected" }
  | { tag: "just_connected" };

interface NetworkBadge {
  label: string;
  cls: string;
}

function networkBadge(network?: string): NetworkBadge | null {
  if (!network) return null;
  switch (network.toLowerCase()) {
    case "zot6":      return { label: "Hubzilla",    cls: "bg-violet-500/20 text-violet-400" };
    case "activitypub": return { label: "ActivityPub", cls: "bg-indigo-500/20 text-indigo-400" };
    case "rss":       return { label: "RSS",          cls: "bg-orange-500/20 text-orange-400" };
    case "diaspora":  return { label: "Diaspora",     cls: "bg-emerald-500/20 text-emerald-400" };
    default:          return null;
  }
}

function buildChatRoomName(names: string[]): string {
  if (names.length === 0) return "Chat";
  if (names.length === 1) return `Chat with ${names[0]}`;
  if (names.length === 2) return `Chat with ${names[0]} and ${names[1]}`;
  if (names.length === 3) return `Chat with ${names[0]}, ${names[1]}, and ${names[2]}`;
  const more = names.length - 3;
  return `Chat with ${names[0]}, ${names[1]}, ${names[2]}, and ${more} more`;
}

export default function AuthorPopover(props: Props) {
  const { t, locale } = useI18n();
  const [open, setOpen] = createSignal(false);
  const [connState, setConnState] = createSignal<ConnState>({ tag: "idle" });
  const [editOpen, setEditOpen] = createSignal(false);
  const [dmOpen, setDmOpen] = createSignal(false);
  const [xchanHash, setXchanHash] = createSignal<string | null>(null);
  const [pdesc, setPdesc] = createSignal<string>("");
  const [chatCreating, setChatCreating] = createSignal(false);
  const [chatPanelOpen, setChatPanelOpen] = createSignal(false);
  const [chatExpire, setChatExpire] = createSignal(0);
  const [chatCustomMode, setChatCustomMode] = createSignal(false);
  const [chatCustomInput, setChatCustomInput] = createSignal("60");
  const [popoverPos, setPopoverPos] = createSignal<{ top: number; left: number } | null>(null);
  const canHover = createMediaQuery("(hover: hover) and (pointer: fine)");
  const auth = useAuth();
  const navViewer = useNavViewer();
  const installedApps = useInstalledApps();
  const chatroomsInstalled = () => installedApps().has("Chatrooms");
  const navigate = useNavigate();
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let triggerRef!: HTMLDivElement;
  let popoverRef!: HTMLDivElement;

  const isSelf = () => {
    const a = auth();
    if (!a?.isLocal || !a.nick || !props.address) return true;
    return props.address === `${a.nick}@${window.location.hostname}`;
  };

  const isLocal = () => auth()?.isLocal ?? false;

  // Use /api/xchan for reliable is_connected check (works in dev + prod,
  // avoids the fuzzy /connections-api search that can miss by address).
  // Once confirmed connected, fetch the full Connection in the background
  // so the edit modal has data ready.
  createEffect(() => {
    if (!open() || !isLocal() || isSelf() || !props.url) return;
    if (connState().tag !== "idle") return;
    setConnState({ tag: "loading" });

    fetch(`/api/xchan?hash=${encodeURIComponent(props.url)}`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then((body: { data?: { is_connected?: boolean; xchan_hash?: string; pdesc?: string } } | null) => {
        if (body?.data?.xchan_hash) setXchanHash(body.data.xchan_hash);
        if (body?.data?.pdesc) setPdesc(body.data.pdesc);
        if (body?.data?.is_connected) {
          setConnState({ tag: "connected", conn: null });
          // Eagerly fetch full Connection for the edit modal
          if (props.address) {
            fetchConnectionByAddress(props.address)
              .then(conn => {
                setConnState(prev =>
                  prev.tag === "connected" ? { tag: "connected", conn } : prev,
                );
              })
              .catch(() => { /* conn stays null — edit button stays disabled */ });
          }
        } else {
          setConnState({ tag: "not_connected" });
        }
      })
      .catch(() => setConnState({ tag: "not_connected" }));
  });

  function calcPos() {
    if (!triggerRef) return;
    const rect = triggerRef.getBoundingClientRect();
    const w = 320;
    let left = rect.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    setPopoverPos({ top: rect.bottom + 8, left: Math.max(8, left) });
  }

  function scheduleClose() {
    closeTimer = setTimeout(() => setOpen(false), 150);
  }

  function cancelClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  }

  createEffect(() => {
    if (!open()) return;
    const handler = (e: MouseEvent) => {
      if (!triggerRef?.contains(e.target as Node) && !popoverRef?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  async function handleConnect(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (connState().tag !== "not_connected" || !props.address) return;
    setConnState({ tag: "loading" });
    try {
      await addConnection(props.address);
      setConnState({ tag: "just_connected" });
    } catch {
      setConnState({ tag: "not_connected" });
    }
  }

  function handleEditClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const s = connState();
    if (s.tag !== "connected" || !s.conn) return;
    setOpen(false);
    setEditOpen(true);
  }

  function handleDm(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setDmOpen(true);
  }

  function handleChatButtonClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setChatPanelOpen((v) => !v);
    setChatExpire(0);
    setChatCustomMode(false);
    setChatCustomInput("60");
  }

  async function handleStartChat(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const hash = xchanHash();
    const nick = auth()?.nick;
    if (!hash || !nick) return;
    setChatPanelOpen(false);
    setChatCreating(true);
    try {
      const room = await createRoom(nick, {
        name: buildChatRoomName([props.name, navViewer()?.name].filter(Boolean) as string[]),
        expire: chatExpire(),
        visibility: "private",
        allow_cid: [hash],
      });
      navigate(`/chat/${nick}/${room.id}`);
    } catch {
      // ignore — chat app may not be installed
    } finally {
      setChatCreating(false);
    }
  }

  onCleanup(() => { if (closeTimer) clearTimeout(closeTimer); });

  const cs = () => connState();

  const badge = (): NetworkBadge | null => {
    const state = connState();
    const net = state.tag === "connected" ? (state.conn?.network ?? props.network) : props.network;
    return networkBadge(net);
  };

  const chanviewUrl = () =>
    props.url ? `/chanview?f=&hash=${encodeURIComponent(props.url)}` : undefined;

  // The edit button is visible as soon as tag === "connected", but disabled
  // until conn is populated (the background fetch).
  const editReady = () => cs().tag === "connected" && (cs() as { tag: "connected"; conn: Connection | null }).conn !== null;

  return (
    <>
      <div
        ref={triggerRef}
        class="relative shrink-0"
        onMouseEnter={() => { if (canHover()) { cancelClose(); calcPos(); setOpen(true); } }}
        onMouseLeave={() => { if (canHover()) scheduleClose(); }}
        onClick={() => { if (!canHover()) { if (open()) setOpen(false); else { calcPos(); setOpen(true); } } }}
      >
        {props.children}
      </div>
      <Portal>
        <Show when={open() && popoverPos()}>
          <div
            ref={popoverRef}
            class="fixed z-[9999] w-80 bg-surface border border-rim rounded-xl shadow-xl overflow-hidden"
            style={{ top: `${popoverPos()!.top}px`, left: `${popoverPos()!.left}px` }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {/* Identity */}
            <div class="p-3">
              <div class="flex items-start gap-3">
                <Show
                  when={props.avatar}
                  fallback={
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-txt
                                shrink-0 flex items-center justify-center text-accent-fg text-sm font-bold">
                      {props.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  }
                >
                  <img
                    src={props.avatar}
                    width="48"
                    height="48"
                    class="w-12 h-12 rounded-full object-cover ring-2 ring-rim shrink-0"
                  />
                </Show>
                <div class="min-w-0 flex-1 pt-0.5">
                  <div class="font-semibold text-sm text-txt truncate leading-tight">{props.name}</div>
                  <Show when={props.address}>
                    <div class="text-xs text-muted truncate mt-0.5">{props.address}</div>
                  </Show>
                  <Show when={badge()}>
                    {(b) => (
                      <span class={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold leading-none ${b().cls}`}>
                        {b().label}
                      </span>
                    )}
                  </Show>
                </div>
              </div>

              <Show when={pdesc()}>
                <p class="text-xs text-txt/70 line-clamp-3 mt-2 leading-snug">{pdesc()}</p>
              </Show>

              {/* Connection details — only once the full Connection is loaded */}
              <Show when={cs().tag === "connected" && (cs() as { tag: "connected"; conn: Connection | null }).conn}>
                {(_) => {
                  const conn = (cs() as { tag: "connected"; conn: Connection }).conn;
                  return (
                    <div class="mt-2 pt-2 border-t border-rim/50 flex flex-wrap gap-x-3 gap-y-0.5">
                      <Show when={conn.connected}>
                        <span class="text-[10px] text-muted">
                          {t("ui.connected_since")} {new Date(conn.connected + "Z").toLocaleDateString(locale(), { year: "numeric", month: "short" })}
                        </span>
                      </Show>
                      <Show when={conn.role}>
                        <span class="text-[10px] text-muted capitalize">{conn.role}</span>
                      </Show>
                    </div>
                  );
                }}
              </Show>
            </div>

            {/* Actions — single icon-only row */}
            <Show when={chanviewUrl() || (isLocal() && !isSelf())}>
              <div class="px-3 pb-3 flex gap-1.5 items-center">
                <Show when={chanviewUrl()}>
                  <a
                    href={chanviewUrl()}
                    title={t("ui.view_profile")}
                    class="w-8 h-8 flex items-center justify-center rounded-lg border border-rim text-muted
                           hover:border-accent hover:text-accent transition-colors"
                  >
                    <MdOutlinePerson size={16} />
                  </a>
                </Show>

                <Show when={isLocal() && !isSelf()}>
                  <Show when={cs().tag === "loading"}>
                    <button disabled class="w-8 h-8 flex items-center justify-center rounded-lg border border-rim text-muted cursor-default">
                      <span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    </button>
                  </Show>

                  <Show when={cs().tag === "not_connected"}>
                    <button
                      onClick={handleConnect}
                      title={t("ui.connect")}
                      class="w-8 h-8 flex items-center justify-center rounded-lg bg-accent text-accent-fg
                             hover:opacity-90 transition-opacity"
                    >
                      <MdOutlinePerson_add size={16} />
                    </button>
                  </Show>

                  <Show when={cs().tag === "just_connected"}>
                    <button disabled title={t("ui.connected_check")}
                      class="w-8 h-8 flex items-center justify-center rounded-lg border border-rim text-muted cursor-default">
                      <MdOutlineCheck size={16} />
                    </button>
                  </Show>

                  <Show when={cs().tag === "connected"}>
                    <button
                      onClick={handleEditClick}
                      disabled={!editReady()}
                      title={t("ui.edit_connection")}
                      class="w-8 h-8 flex items-center justify-center rounded-lg border border-rim text-muted
                             hover:border-accent hover:text-accent transition-colors
                             disabled:opacity-50 disabled:cursor-default disabled:hover:border-rim disabled:hover:text-muted"
                    >
                      <Show when={editReady()} fallback={<span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />}>
                        <MdOutlineEdit size={16} />
                      </Show>
                    </button>
                  </Show>

                  <Show when={xchanHash()}>
                    <button
                      onClick={handleDm}
                      title={t("ui.send_dm")}
                      class="w-8 h-8 flex items-center justify-center rounded-lg border border-rim text-muted
                             hover:border-accent hover:text-accent transition-colors"
                    >
                      <MdOutlineEmail size={16} />
                    </button>
                    <Show when={chatroomsInstalled()}>
                      <button
                        onClick={handleChatButtonClick}
                        disabled={chatCreating()}
                        title={t("ui.start_chatroom")}
                        class="w-8 h-8 flex items-center justify-center rounded-lg border border-rim text-muted
                               hover:border-accent hover:text-accent transition-colors
                               disabled:opacity-50 disabled:cursor-default disabled:hover:border-rim disabled:hover:text-muted"
                      >
                        <Show when={!chatCreating()} fallback={<span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />}>
                          <MdOutlineChat_bubble size={16} />
                        </Show>
                      </button>
                    </Show>
                  </Show>
                </Show>
              </div>
            </Show>

            {/* Expiry picker — shown after clicking the chat icon */}
            <Show when={chatPanelOpen() && chatroomsInstalled()}>
              <div class="px-3 pb-3 border-t border-rim/50 pt-2 space-y-2">
                <p class="text-[11px] text-muted">{t("chat.expire_after")}</p>
                <div class="flex gap-1.5 flex-wrap items-center">
                  {([
                    [0,     "Never"],
                    [5,     "5m"],
                    [60,    "1h"],
                    [1440,  "24h"],
                    [10080, "1w"],
                  ] as [number, string][]).map(([val, label]) => (
                    <button
                      onClick={() => { setChatExpire(val); setChatCustomMode(false); }}
                      class={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        chatExpire() === val && !chatCustomMode()
                          ? "border-accent text-accent bg-accent/10"
                          : "border-rim text-muted hover:border-accent hover:text-accent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => { setChatCustomMode(true); setChatExpire(parseInt(chatCustomInput()) || 60); }}
                    class={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      chatCustomMode()
                        ? "border-accent text-accent bg-accent/10"
                        : "border-rim text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    Custom
                  </button>
                  <Show when={chatCustomMode()}>
                    <input
                      type="number"
                      min="1"
                      max="10080"
                      value={chatCustomInput()}
                      onInput={(e) => {
                        setChatCustomInput(e.currentTarget.value);
                        setChatExpire(parseInt(e.currentTarget.value) || 0);
                      }}
                      placeholder="min"
                      class="w-16 bg-surface border border-accent text-txt text-xs rounded-md px-2 py-1 focus:outline-none"
                    />
                  </Show>
                </div>
                <button
                  onClick={handleStartChat}
                  class="w-full text-xs bg-accent text-accent-fg rounded-lg py-1.5 hover:opacity-90 transition-opacity"
                >
                  {t("chat.create")}
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </Portal>

      {/* Connection editor modal */}
      <Show when={editOpen() && cs().tag === "connected" && (cs() as { tag: "connected"; conn: Connection | null }).conn}>
        <ConnectionEditorModal
          connection={(cs() as { tag: "connected"; conn: Connection }).conn}
          authorName={props.name}
          authorAvatar={props.avatar}
          onClose={() => setEditOpen(false)}
          onDeleted={() => {
            setConnState({ tag: "not_connected" });
            setEditOpen(false);
          }}
        />
      </Show>

      {/* DM composer */}
      <Show when={dmOpen() && auth() && xchanHash()}>
        <PostComposer
          open={dmOpen()}
          onClose={() => setDmOpen(false)}
          profileUid={auth()!.uid}
          initialAclMode="custom"
          initialAllowEntries={new Set([`c:${xchanHash()!}`])}
        />
      </Show>
    </>
  );
}
