// modules/directory/views/sections/PrivacyGroupDetailView.tsx
import {
  createSignal,
  createEffect,
  For,
  Show,
  type Component,
} from "solid-js";
import {
  MdFillVisibility,
  MdFillVisibility_off,
  MdFillStar,
  MdFillStar_border,
  MdFillDelete,
  MdFillSave,
  MdFillPerson_add,
  MdFillPerson_remove,
} from "solid-icons/md";
import SubPageContent from "@/shared/views/SubPageContent";
import {
  activeGroup,
  detailLoading,
  error,
  loadGroup,
  updateGroup,
  toggleMember,
  deleteGroup,
} from "../../groups/store";
import { fetchAvailableContacts } from "../../groups/api";
import type { GroupContact } from "../../groups/api";

// ── Contact pill ──────────────────────────────────────────────────────────────

const ContactPill: Component<{
  contact: GroupContact;
  inGroup: boolean;
  onToggle: () => void;
  busy: boolean;
}> = (props) => (
  <button
    onClick={props.onToggle}
    disabled={props.busy}
    title={props.inGroup ? "Remove from group" : "Add to group"}
    class={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors w-full text-left
      ${props.inGroup
        ? "bg-accent-muted border-accent text-accent"
        : "bg-surface border-rim text-txt hover:bg-elevated"}
      disabled:opacity-50`}
  >
    <img
      src={props.contact.photo}
      alt={props.contact.name}
      class="w-7 h-7 rounded-full shrink-0 object-cover bg-overlay"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
    <span class="flex-1 min-w-0">
      <span class="font-medium truncate block">{props.contact.name}</span>
      <Show when={props.contact.addr}>
        <span class="text-xs text-muted truncate block">{props.contact.addr}</span>
      </Show>
    </span>
    <span class="shrink-0 opacity-70">
      {props.inGroup ? <MdFillPerson_remove size={15} /> : <MdFillPerson_add size={15} />}
    </span>
  </button>
);

// ── Detail view ───────────────────────────────────────────────────────────────

interface Props {
  id: string;
  onDeleted: () => void;
}

const PrivacyGroupDetailView: Component<Props> = (props) => {
  const [name, setName] = createSignal("");
  const [visible, setVisible] = createSignal(false);
  const [editBusy, setEditBusy] = createSignal(false);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [available, setAvailable] = createSignal<GroupContact[]>([]);
  const [togglingHash, setTogglingHash] = createSignal<string | null>(null);
  const [search, setSearch] = createSignal("");

  // Reload whenever the id prop changes
  createEffect(() => {
    const id = parseInt(props.id, 10);
    if (!id) return;
    loadGroup(id).then(() => {
      const g = activeGroup();
      if (g) {
        setName(g.group.name);
        setVisible(g.group.visible);
      }
    });
    fetchAvailableContacts(id).then(setAvailable).catch(() => {});
  });

  const memberHashes = () =>
    new Set((activeGroup()?.members ?? []).map((m) => m.xchan_hash));

  const allContacts = () => {
    const members = activeGroup()?.members ?? [];
    const av = available();
    const seen = new Set(members.map((m) => m.xchan_hash));
    return [...members, ...av.filter((c) => !seen.has(c.xchan_hash))];
  };

  const filtered = () => {
    const q = search().toLowerCase();
    if (!q) return allContacts();
    return allContacts().filter(
      (c) => c.name.toLowerCase().includes(q) || c.addr.toLowerCase().includes(q),
    );
  };

  async function saveEdit(e: Event) {
    e.preventDefault();
    setEditBusy(true);
    await updateGroup(parseInt(props.id, 10), { name: name(), visible: visible() });
    setEditBusy(false);
  }

  async function handleDelete(e: Event) {
    e.preventDefault();
    const g = activeGroup()?.group;
    if (!g || !confirm(`Delete group "${g.name}"?`)) return;
    setDeleteBusy(true);
    await deleteGroup(g.id);
    props.onDeleted();
  }

  async function handleToggle(hash: string) {
    const id = parseInt(props.id, 10);
    setTogglingHash(hash);
    await toggleMember(id, hash);
    fetchAvailableContacts(id).then(setAvailable).catch(() => {});
    setTogglingHash(null);
  }

  async function toggleDefaultAcl(e: Event) {
    e.preventDefault();
    const g = activeGroup()?.group;
    if (!g) return;
    await updateGroup(g.id, { set_default_acl: !g.is_default_acl });
  }

  async function toggleDefaultGroup(e: Event) {
    e.preventDefault();
    const g = activeGroup()?.group;
    if (!g) return;
    await updateGroup(g.id, { set_default_group: !g.is_default_group });
  }

  return (
    <Show
      when={!detailLoading()}
      fallback={
        <div class="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4 animate-pulse">
          <div class="bg-surface border border-rim rounded-xl h-44" />
          <div class="bg-surface border border-rim rounded-xl h-72" />
        </div>
      }
    >
      <Show when={error()}>
        <p class="text-red-500 text-sm px-4 pt-4">{error()}</p>
      </Show>

      <Show when={activeGroup()} keyed>
        {(detail) => (
          <>
            <SubPageContent
              title={detail.group.name}
              description="Edit name, visibility, and default settings."
              action={
                <button
                  onClick={saveEdit}
                  disabled={editBusy()}
                  class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-txt
                         text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <MdFillSave size={15} />
                  {editBusy() ? "Saving…" : "Save"}
                </button>
              }
            >
              <div class="space-y-3">
                <input
                  type="text"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  placeholder="Group name"
                  class="w-full bg-surface border border-rim text-txt rounded-lg px-3 py-2 text-sm
                         hover:border-rim-strong focus:outline-none focus:border-accent"
                />

                <label class="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={visible()}
                    onChange={(e) => setVisible(e.currentTarget.checked)}
                    class="accent-[var(--accent)]"
                  />
                  {visible()
                    ? <span class="flex items-center gap-1"><MdFillVisibility size={13} />Members visible to others</span>
                    : <span class="flex items-center gap-1"><MdFillVisibility_off size={13} />Keep membership private</span>}
                </label>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={toggleDefaultAcl}
                    class={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors
                      ${detail.group.is_default_acl
                        ? "border-accent bg-accent-muted text-accent"
                        : "border-rim text-muted hover:bg-elevated"}`}
                  >
                    {detail.group.is_default_acl ? <MdFillStar size={14} /> : <MdFillStar_border size={14} />}
                    Post to this group by default
                  </button>

                  <button
                    onClick={toggleDefaultGroup}
                    class={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors
                      ${detail.group.is_default_group
                        ? "border-accent bg-accent-muted text-accent"
                        : "border-rim text-muted hover:bg-elevated"}`}
                  >
                    {detail.group.is_default_group ? <MdFillStar size={14} /> : <MdFillStar_border size={14} />}
                    Add new connections by default
                  </button>
                </div>

                <div class="pt-2 border-t border-rim">
                  <button
                    onClick={handleDelete}
                    disabled={deleteBusy()}
                    class="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600
                           disabled:opacity-50 transition-colors"
                  >
                    <MdFillDelete size={15} />
                    {deleteBusy() ? "Deleting…" : "Delete group"}
                  </button>
                </div>
              </div>
            </SubPageContent>

            <SubPageContent
              title={`Members (${detail.members.length})`}
              description="Click a connection to add or remove them from the group."
              action={
                <input
                  type="search"
                  placeholder="Search…"
                  value={search()}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                  class="bg-surface border border-rim text-txt text-xs rounded-lg px-2.5 py-1.5 w-36
                         hover:border-rim-strong focus:outline-none focus:border-accent"
                />
              }
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto">
                <For
                  each={filtered()}
                  fallback={
                    <p class="text-muted text-sm col-span-2 py-6 text-center">
                      No connections found.
                    </p>
                  }
                >
                  {(contact) => (
                    <ContactPill
                      contact={contact}
                      inGroup={memberHashes().has(contact.xchan_hash)}
                      onToggle={() => handleToggle(contact.xchan_hash)}
                      busy={togglingHash() === contact.xchan_hash}
                    />
                  )}
                </For>
              </div>
            </SubPageContent>
          </>
        )}
      </Show>
    </Show>
  );
};

export default PrivacyGroupDetailView;
