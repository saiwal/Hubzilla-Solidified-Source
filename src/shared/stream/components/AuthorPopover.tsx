import { createSignal, createEffect, Show, onCleanup, type JSX } from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import { MdOutlinePerson, MdOutlinePerson_add, MdOutlineEdit } from "solid-icons/md";
import { useAuth } from "@/shared/store/auth-store";
import { addConnection } from "@/modules/directory/people/api";
import { fetchConnectionByAddress } from "@/modules/directory/connections/api";
import type { Connection } from "@/modules/directory/connections/api";
import ConnectionEditorModal from "@/shared/views/ConnectionEditorModal";

interface Props {
  name: string;
  avatar?: string;
  url?: string;
  address?: string;
  children: JSX.Element;
}

type ConnState =
  | { tag: "idle" }
  | { tag: "loading" }
  | { tag: "connected"; conn: Connection }
  | { tag: "not_connected" }
  | { tag: "just_connected" };

export default function AuthorPopover(props: Props) {
  const [open, setOpen] = createSignal(false);
  const [connState, setConnState] = createSignal<ConnState>({ tag: "idle" });
  const [editOpen, setEditOpen] = createSignal(false);
  const canHover = createMediaQuery("(hover: hover) and (pointer: fine)");
  const auth = useAuth();
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const isSelf = () => {
    const a = auth();
    if (!a?.isLocal || !a.nick || !props.address) return true;
    return props.address === `${a.nick}@${window.location.hostname}`;
  };

  const isLocal = () => auth()?.isLocal ?? false;

  // Look up connection status the first time the popover opens
  createEffect(() => {
    if (!open() || !isLocal() || isSelf() || !props.address) return;
    if (connState().tag !== "idle") return;
    setConnState({ tag: "loading" });
    fetchConnectionByAddress(props.address)
      .then((conn: Connection | null) => setConnState(conn ? { tag: "connected", conn } : { tag: "not_connected" }))
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
    const cs = connState();
    if (cs.tag !== "not_connected" || !props.address) return;
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
    setOpen(false);
    setEditOpen(true);
  }

  onCleanup(() => { if (closeTimer) clearTimeout(closeTimer); });

  const cs = () => connState();

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
            class="absolute left-0 top-full mt-2 z-50 w-60 bg-surface border border-rim
                   rounded-xl shadow-xl p-3"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {/* Identity */}
            <div class="flex items-center gap-3">
              <Show
                when={props.avatar}
                fallback={
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-txt
                              shrink-0 flex items-center justify-center text-accent-fg text-sm font-bold">
                    {props.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                }
              >
                <img
                  src={props.avatar}
                  width="40"
                  height="40"
                  class="w-10 h-10 rounded-full object-cover ring-1 ring-rim shrink-0"
                />
              </Show>
              <div class="min-w-0 flex-1">
                <div class="font-semibold text-sm text-txt truncate">{props.name}</div>
                <Show when={props.address}>
                  <div class="text-xs text-subtle truncate mt-0.5">{props.address}</div>
                </Show>
              </div>
            </div>

            {/* Actions */}
            <Show when={props.url || (isLocal() && !isSelf())}>
              <div class="mt-3 flex gap-2">
                <Show when={props.url}>
                  <a
                    href={props.url}
                    class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                           border border-rim rounded-lg text-xs text-muted
                           hover:border-accent hover:text-accent transition-colors"
                  >
                    <MdOutlinePerson size={14} />
                    <span>View Profile</span>
                  </a>
                </Show>

                <Show when={isLocal() && !isSelf()}>
                  {/* Loading */}
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
                             border border-rim rounded-lg text-xs text-muted
                             hover:border-accent hover:text-accent transition-colors"
                    >
                      <MdOutlinePerson_add size={14} />
                      <span>Connect</span>
                    </button>
                  </Show>

                  {/* Just connected (optimistic, no conn object yet) */}
                  <Show when={cs().tag === "just_connected"}>
                    <button disabled class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                                           border border-rim rounded-lg text-xs text-subtle cursor-default">
                      <span>✓ Connected</span>
                    </button>
                  </Show>

                  {/* Connected — edit button */}
                  <Show when={cs().tag === "connected"}>
                    <button
                      onClick={handleEditClick}
                      class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
                             border border-rim rounded-lg text-xs text-muted
                             hover:border-accent hover:text-accent transition-colors"
                    >
                      <MdOutlineEdit size={14} />
                      <span>Edit Connection</span>
                    </button>
                  </Show>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Connection editor modal */}
      <Show when={editOpen() && cs().tag === "connected"}>
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
    </>
  );
}
