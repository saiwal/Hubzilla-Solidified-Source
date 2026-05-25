import { createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import type { Connection } from "@/modules/directory/connections/api";
import { updateConnection, deleteConnection } from "@/modules/directory/connections/api";

const BUILTIN_ROLES = ["contributor", "muted"];

interface Props {
  connection: Connection;
  authorName: string;
  authorAvatar?: string;
  onClose: () => void;
  onDeleted: () => void;
}

function formatDate(iso: string): string {
  if (!iso || iso.startsWith("0001")) return "";
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export default function ConnectionEditorModal(props: Props) {
  const [role, setRole] = createSignal(props.connection.role ?? "");
  const [closeness, setCloseness] = createSignal(props.connection.closeness ?? 80);
  const [saving, setSaving] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);

  const roleOptions = () => {
    const all = ["", ...new Set([...BUILTIN_ROLES, role()].filter(Boolean))];
    return all.map((r) => ({ value: r, label: r ? capitalize(r) : "No role" }));
  };

  const connectedOn = () => formatDate(props.connection.connected);

  async function handleSave() {
    setSaving(true);
    try {
      await updateConnection(props.connection.id, { role: role(), closeness: closeness() });
      props.onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete()) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteConnection(props.connection.id);
      props.onDeleted();
      props.onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Portal>
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        <div class="w-full max-w-sm rounded-2xl bg-surface border border-rim shadow-2xl overflow-hidden">

          {/* Header */}
          <div class="flex items-center gap-3 p-4 border-b border-rim">
            <Show
              when={props.authorAvatar}
              fallback={
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-txt
                            shrink-0 flex items-center justify-center text-accent-fg text-sm font-bold">
                  {props.authorName[0]?.toUpperCase() ?? "?"}
                </div>
              }
            >
              <img
                src={props.authorAvatar}
                width="40"
                height="40"
                class="w-10 h-10 rounded-full object-cover ring-1 ring-rim shrink-0"
              />
            </Show>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-txt truncate">{props.authorName}</div>
              <div class="text-xs text-muted truncate">{props.connection.address}</div>
            </div>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg text-muted hover:text-txt hover:bg-overlay transition-colors shrink-0"
              aria-label="Close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div class="p-4 space-y-4">

            {/* Role */}
            <div>
              <label class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Role
              </label>
              <select
                value={role()}
                onChange={(e) => setRole(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt text-sm
                       focus:outline-none hover:border-rim-strong transition-colors"
              >
                <For each={roleOptions()}>
                  {(opt) => <option value={opt.value}>{opt.label}</option>}
                </For>
              </select>
            </div>

            {/* Closeness */}
            <div>
              <label class="flex items-center justify-between text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                <span>Closeness</span>
                <span class="text-txt tabular-nums font-medium normal-case">{closeness()}</span>
              </label>
              <input
                type="range"
                min="0"
                max="99"
                value={closeness()}
                onInput={(e) => setCloseness(Number(e.currentTarget.value))}
                class="w-full accent-accent"
              />
              <div class="flex justify-between text-[10px] text-muted mt-1">
                <span>Distant</span>
                <span>Close</span>
              </div>
            </div>

            {/* Meta */}
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              <Show when={connectedOn()}>
                <div class="text-xs text-muted">
                  Connected <span class="text-txt">{connectedOn()}</span>
                </div>
              </Show>
              <Show when={props.connection.pending}>
                <span class="text-xs px-1.5 py-0.5 rounded bg-accent-muted text-accent font-medium">
                  Pending
                </span>
              </Show>
              <For each={props.connection.status}>
                {(s) => (
                  <span class="text-xs px-1.5 py-0.5 rounded bg-overlay text-muted">
                    {s}
                  </span>
                )}
              </For>
            </div>
          </div>

          {/* Footer */}
          <div class="flex items-center gap-2 px-4 py-3 border-t border-rim">
            <button
              onClick={handleDelete}
              disabled={deleting()}
              class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors
                     disabled:opacity-50 disabled:cursor-default
                     ${confirmDelete()
                       ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                       : "text-muted hover:bg-overlay hover:text-accent"}`}
            >
              <Show when={deleting()}>
                <span class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              </Show>
              {confirmDelete() ? "Confirm remove?" : "Remove"}
            </button>

            <div class="flex-1" />

            <button
              onClick={props.onClose}
              class="px-3 py-1.5 rounded-lg text-xs border border-rim text-muted
                     hover:bg-overlay transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving()}
              class="px-3 py-1.5 rounded-lg text-xs border border-rim text-muted
                     hover:border-accent hover:text-accent transition-colors
                     disabled:opacity-50 disabled:cursor-default flex items-center gap-1.5"
            >
              <Show when={saving()}>
                <span class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              </Show>
              {saving() ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
