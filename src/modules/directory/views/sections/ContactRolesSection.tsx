import {
  createResource,
  createSignal,
  createMemo,
  For,
  Show,
} from "solid-js";
import { A } from "@solidjs/router";
import {
  fetchConnections,
  fetchPermcats,
  createPermcat,
  deletePermcat,
  updateConnection,
} from "../../connections/api";
import type { Connection, Permcat } from "../../connections/api";
import { useI18n } from "@/i18n";
import { MdFillAdd, MdFillClose } from "solid-icons/md";

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchAllConnections(): Promise<Connection[]> {
  const limit = 50;
  const all: Connection[] = [];
  let offset = 0;
  while (offset < 500) {
    const data = await fetchConnections({ filter: "all", limit, start: offset });
    all.push(...data.connections);
    if (all.length >= data.meta.total || data.connections.length < limit) break;
    offset += limit;
  }
  return all;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NETWORK_LABELS: Record<string, string> = {
  zot6:        "Zot",
  activitypub: "AP",
  rss:         "RSS",
};

// ── Manage Roles Panel ────────────────────────────────────────────────────────

function ManageRolesPanel(props: {
  permcats: Permcat[];
  onCreated: (role: Permcat) => void;
  onDeleted: (name: string) => void;
}) {
  const { t } = useI18n();
  const [creating, setCreating] = createSignal(false);
  const [newName, setNewName] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [deletingName, setDeletingName] = createSignal<string | null>(null);

  const customRoles = () => props.permcats.filter((p) => !p.system && p.name !== "default");

  async function handleCreate(e: Event) {
    e.preventDefault();
    const name = newName().trim();
    if (!name) return;
    setBusy(true);
    try {
      const role = await createPermcat(name);
      props.onCreated(role);
      setNewName("");
      setCreating(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete role "${name}"?`)) return;
    setDeletingName(name);
    try {
      await deletePermcat(name);
      props.onDeleted(name);
    } finally {
      setDeletingName(null);
    }
  }

  return (
    <div class="rounded-lg border border-rim bg-surface px-3 py-2.5">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs font-medium text-muted shrink-0">
          {t("directory.manage_roles")}
        </span>

        {/* Custom role chips */}
        <Show
          when={customRoles().length > 0}
          fallback={
            <Show when={!creating()}>
              <span class="text-xs text-muted italic">{t("directory.no_custom_roles")}</span>
            </Show>
          }
        >
          <For each={customRoles()}>
            {(role) => (
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-overlay text-txt border border-rim">
                {role.label}
                <button
                  onClick={() => handleDelete(role.name)}
                  disabled={deletingName() === role.name}
                  title={t("directory.delete_role")}
                  class="text-muted hover:text-red-500 disabled:opacity-40 transition-colors leading-none"
                >
                  <MdFillClose size={11} />
                </button>
              </span>
            )}
          </For>
        </Show>

        {/* Create form or button */}
        <Show
          when={creating()}
          fallback={
            <button
              onClick={() => setCreating(true)}
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                     border border-dashed border-rim text-muted hover:text-txt hover:border-rim-strong
                     transition-colors"
            >
              <MdFillAdd size={12} />
              {t("directory.create_role")}
            </button>
          }
        >
          <form onSubmit={handleCreate} class="inline-flex items-center gap-1.5">
            <input
              autofocus
              type="text"
              placeholder={t("directory.role_name_placeholder")}
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
              class="text-xs px-2 py-1 rounded-lg border border-rim bg-overlay text-txt w-32
                     focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy() || !newName().trim()}
              class="text-xs px-2.5 py-1 rounded-lg bg-accent text-accent-fg
                     disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {busy() ? t("directory.creating_role") : t("directory.create_role")}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setNewName(""); }}
              class="text-xs px-2.5 py-1 rounded-lg border border-rim text-muted hover:text-txt transition-colors"
            >
              ×
            </button>
          </form>
        </Show>
      </div>
    </div>
  );
}

// ── Connection card with inline role selector ─────────────────────────────────

function RoleCard(props: {
  conn: Connection;
  roleOptions: { name: string; label: string }[];
  onRoleChanged: (newRole: string) => void;
}) {
  const [busy, setBusy] = createSignal(false);
  const { t } = useI18n();
  const networkLabel = () => NETWORK_LABELS[props.conn.network] ?? props.conn.network;

  async function handleRoleChange(e: Event) {
    const select = e.currentTarget as HTMLSelectElement;
    const newRole = select.value;
    if (newRole === props.conn.role) return;
    setBusy(true);
    await updateConnection(props.conn.id, { role: newRole });
    setBusy(false);
    props.onRoleChanged(newRole);
  }

  return (
    <div class="rounded-lg border border-rim bg-surface flex items-center gap-3 p-3">
      <a href={props.conn.url} target="_blank" rel="noopener" class="shrink-0">
        <img
          src={props.conn.photo}
          alt={props.conn.name}
          class="w-11 h-11 rounded-full object-cover ring-1 ring-rim bg-overlay"
        />
      </a>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <a
            href={props.conn.url}
            target="_blank"
            rel="noopener"
            class="font-medium text-sm text-txt truncate hover:underline"
          >
            {props.conn.name}
          </a>
          <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-accent-muted text-accent">
            {networkLabel()}
          </span>
          <Show when={props.conn.is_forum}>
            <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-accent-muted text-accent">
              {t("directory.forum")}
            </span>
          </Show>
        </div>
        <p class="text-xs text-muted truncate mt-0.5">
          {props.conn.address || props.conn.url}
        </p>
      </div>

      {/* Role selector */}
      <select
        value={props.conn.role}
        onChange={handleRoleChange}
        disabled={busy()}
        class="text-xs px-2 py-1.5 rounded-lg border border-rim bg-surface text-txt
               focus:outline-none hover:border-rim-strong transition-colors
               disabled:opacity-50 shrink-0"
      >
        <For each={props.roleOptions}>
          {(r) => <option value={r.name}>{r.label}</option>}
        </For>
      </select>

      <A
        href={`/abook/${props.conn.id}`}
        class="p-1.5 rounded text-muted hover:text-txt hover:bg-overlay transition-colors shrink-0"
        title="Edit connection"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586a2 2 0 00-2.828-2.828l-8.586 8.586V15h2.828z" />
        </svg>
      </A>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <For each={Array(6).fill(0)}>
        {() => (
          <div class="rounded-lg border border-rim bg-surface p-3 flex items-center gap-3">
            <div class="w-11 h-11 rounded-full bg-overlay shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 bg-overlay rounded w-1/3" />
              <div class="h-3 bg-overlay rounded w-1/2" />
            </div>
            <div class="h-7 w-24 bg-overlay rounded-lg shrink-0" />
          </div>
        )}
      </For>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function ContactRolesSection() {
  const [connections, { mutate: mutateConns }] = createResource(fetchAllConnections);
  const [permcats, { mutate: mutatePermcats }] = createResource(fetchPermcats);
  const [activeRole, setActiveRole] = createSignal<string | null>(null);

  // Role options for the per-connection dropdown (excludes "default" — "" covers that)
  const roleOptions = createMemo<{ name: string; label: string }[]>(() => {
    const cats = (permcats() ?? []).filter((p) => p.name !== "default");
    return [
      { name: "", label: "No role" },
      ...cats.map((p) => ({ name: p.name, label: p.label })),
    ];
  });

  // Role filter pills — driven by permcats so new roles appear and deleted ones vanish immediately
  const rolePills = createMemo(() => {
    const data = connections() ?? [];
    const cats = (permcats() ?? []).filter((p) => p.name !== "default");

    const counts = new Map<string, number>();
    for (const c of data) {
      const key = c.role ?? "";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const noRoleCount = counts.get("") ?? 0;

    return [
      { name: null as string | null, label: "All", count: data.length },
      ...(noRoleCount > 0
        ? [{ name: "" as string | null, label: "No role", count: noRoleCount }]
        : []),
      ...cats.map((p) => ({
        name: p.name as string | null,
        label: p.label,
        count: counts.get(p.name) ?? 0,
      })),
    ];
  });

  const selected = createMemo(() => activeRole());

  const filtered = createMemo(() => {
    const data = connections() ?? [];
    const sel = selected();
    if (sel === null) return data;
    return data.filter((c) => (c.role ?? "") === sel);
  });

  function handleRoleChanged(conn: Connection, newRole: string) {
    mutateConns((prev) =>
      prev?.map((c) => (c.id === conn.id ? { ...c, role: newRole } : c))
    );
  }

  function handlePermcatCreated(role: Permcat) {
    mutatePermcats((prev) => [...(prev ?? []), role]);
  }

  function handlePermcatDeleted(name: string) {
    mutatePermcats((prev) => (prev ?? []).filter((p) => p.name !== name));
    // Locally unset this role from any connections that had it
    mutateConns((prev) => prev?.map((c) => c.role === name ? { ...c, role: "" } : c));
    if (activeRole() === name) setActiveRole(null);
  }

  return (
    <div class="px-4 md:px-6 py-6 space-y-4">
      {/* Role management panel */}
      <Show when={!permcats.loading}>
        <ManageRolesPanel
          permcats={permcats() ?? []}
          onCreated={handlePermcatCreated}
          onDeleted={handlePermcatDeleted}
        />
      </Show>

      <Show when={!connections.loading} fallback={<Skeleton />}>
        <Show
          when={(connections() ?? []).length > 0}
          fallback={
            <p class="py-8 text-center text-sm text-muted">No connections found.</p>
          }
        >
          {/* ── Role filter pills ── */}
          <div class="flex flex-wrap gap-1.5">
            <For each={rolePills()}>
              {(pill) => (
                <button
                  onClick={() => setActiveRole(pill.name)}
                  class={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1.5 ${
                    selected() === pill.name
                      ? "bg-accent text-accent-fg"
                      : "bg-overlay text-muted hover:bg-surface"
                  }`}
                >
                  {pill.label}
                  <span class={`text-xs font-medium tabular-nums ${
                    selected() === pill.name ? "opacity-80" : "text-muted"
                  }`}>
                    {pill.count}
                  </span>
                </button>
              )}
            </For>
          </div>

          <p class="text-sm text-muted">
            {filtered().length} connection{filtered().length !== 1 ? "s" : ""}
            {selected() !== null && (
              <> — use the dropdown on each card to assign a role</>
            )}
          </p>

          {/* ── Connection list ── */}
          <div class="space-y-2">
            <For each={filtered()}>
              {(conn) => (
                <RoleCard
                  conn={conn}
                  roleOptions={roleOptions()}
                  onRoleChanged={(newRole) => handleRoleChanged(conn, newRole)}
                />
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
