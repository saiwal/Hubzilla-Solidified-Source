import { createSignal, createEffect, Show, onCleanup, type JSX } from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import { MdOutlinePerson, MdOutlinePerson_add, MdOutlineEdit, MdOutlineMessage, MdOutlineChat } from "solid-icons/md";
import { useAuth } from "@/shared/store/auth-store";
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

export default function AuthorPopover(props: Props) {
  const { t, locale } = useI18n();
  const [open, setOpen] = createSignal(false);
  const [connState, setConnState] = createSignal<ConnState>({ tag: "idle" });
  const [editOpen, setEditOpen] = createSignal(false);
  const [dmOpen, setDmOpen] = createSignal(false);
  const [xchanHash, setXchanHash] = createSignal<string | null>(null);
  const [chatCreating, setChatCreating] = createSignal(false);
  const canHover = createMediaQuery("(hover: hover) and (pointer: fine)");
  const auth = useAuth();
  const navigate = useNavigate();
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

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
      .then((body: { data?: { is_connected?: boolean; xchan_hash?: string } } | null) => {
        if (body?.data?.xchan_hash) setXchanHash(body.data.xchan_hash);
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

  function scheduleClose() {
    closeTimer = setTimeout(() => setOpen(false), 150);
  }

  function cancelClose() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  }

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

  async function handleStartChat(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const hash = xchanHash();
    const nick = auth()?.nick;
    if (!hash || !nick) return;
    setOpen(false);
    setChatCreating(true);
    try {
      const room = await createRoom(nick, {
        name: props.name,
        expire: 0,
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
        class="relative shrink-0"
        onMouseEnter={() => { if (canHover()) { cancelClose(); setOpen(true); } }}
        onMouseLeave={() => { if (canHover()) scheduleClose(); }}
        onClick={() => { if (!canHover()) setOpen((v) => !v); }}
      >
        {props.children}
        <Show when={open()}>
          <div
            class="absolute left-0 top-full mt-2 z-50 w-64 bg-surface border border-rim
                   rounded-xl shadow-xl overflow-hidden"
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

            {/* Actions */}
            <Show when={chanviewUrl() || (isLocal() && !isSelf())}>
              <div class="px-3 pb-3 flex gap-2">
                <Show when={chanviewUrl()}>
                  <a
                    href={chanviewUrl()}
                    class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                           border border-rim rounded-lg text-xs text-muted
                           hover:border-accent hover:text-accent transition-colors"
                  >
                    <MdOutlinePerson size={14} />
                    <span>{t("ui.view_profile")}</span>
                  </a>
                </Show>

                <Show when={isLocal() && !isSelf()}>
                  {/* Checking connection status */}
                  <Show when={cs().tag === "loading"}>
                    <button disabled class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                                           border border-rim rounded-lg text-xs text-muted cursor-default">
                      <span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    </button>
                  </Show>

                  {/* Not connected */}
                  <Show when={cs().tag === "not_connected"}>
                    <button
                      onClick={handleConnect}
                      class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                             bg-accent text-accent-fg rounded-lg text-xs font-medium
                             hover:opacity-90 transition-opacity"
                    >
                      <MdOutlinePerson_add size={14} />
                      <span>{t("ui.connect")}</span>
                    </button>
                  </Show>

                  {/* Just connected (optimistic) */}
                  <Show when={cs().tag === "just_connected"}>
                    <button disabled class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                                           border border-rim rounded-lg text-xs text-muted cursor-default">
                      <span>{t("ui.connected_check")}</span>
                    </button>
                  </Show>

                  {/* Connected — edit (disabled until conn data arrives) */}
                  <Show when={cs().tag === "connected"}>
                    <button
                      onClick={handleEditClick}
                      disabled={!editReady()}
                      title={!editReady() ? undefined : t("ui.edit_connection")}
                      class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                             border border-rim rounded-lg text-xs text-muted
                             hover:border-accent hover:text-accent transition-colors
                             disabled:opacity-50 disabled:cursor-default disabled:hover:border-rim disabled:hover:text-muted"
                    >
                      <Show
                        when={editReady()}
                        fallback={<span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />}
                      >
                        <MdOutlineEdit size={14} />
                      </Show>
                      <span>{t("ui.edit_connection")}</span>
                    </button>
                  </Show>
                </Show>
              </div>
            </Show>

            {/* Message actions */}
            <Show when={isLocal() && !isSelf() && xchanHash()}>
              <div class="px-3 pb-3 flex gap-2 border-t border-rim/40 pt-2">
                <button
                  onClick={handleDm}
                  title={t("ui.send_dm")}
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                         border border-rim rounded-lg text-xs text-muted
                         hover:border-accent hover:text-accent transition-colors"
                >
                  <MdOutlineMessage size={14} />
                  <span>{t("ui.send_dm")}</span>
                </button>
                <button
                  onClick={handleStartChat}
                  disabled={chatCreating()}
                  title={t("ui.start_chatroom")}
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                         border border-rim rounded-lg text-xs text-muted
                         hover:border-accent hover:text-accent transition-colors
                         disabled:opacity-50 disabled:cursor-default disabled:hover:border-rim disabled:hover:text-muted"
                >
                  <Show
                    when={!chatCreating()}
                    fallback={<span class="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />}
                  >
                    <MdOutlineChat size={14} />
                  </Show>
                  <span>{t("ui.start_chatroom")}</span>
                </button>
              </div>
            </Show>
          </div>
        </Show>
      </div>

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
