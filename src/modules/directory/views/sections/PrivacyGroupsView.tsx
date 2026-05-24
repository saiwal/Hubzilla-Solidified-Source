// modules/directory/views/sections/PrivacyGroupsView.tsx
//
// Rendered by ConnectionsShellView when activeKey === "privacy-groups"
// and there is no :id param present.

import {
  createSignal,
  For,
  Show,
  onMount,
  type Component,
} from "solid-js";
import { A } from "@solidjs/router";
import {
  MdFillGroup,
  MdFillAdd,
  MdFillDelete,
  MdFillVisibility,
  MdFillVisibility_off,
  MdFillStar,
  MdFillStar_border,
} from "solid-icons/md";
import SubPageContent from "@/shared/views/SubPageContent";
import {
  groups,
  loading,
  error,
  loadGroups,
  createGroup,
  deleteGroup,
  updateGroup,
} from "../../groups/store";
import type { PrivacyGroup } from "../../groups/api";

// ── Inline create form ────────────────────────────────────────────────────────

const CreateForm: Component = () => {
  const [name, setName] = createSignal("");
  const [visible, setVisible] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (!name().trim()) return;
    setBusy(true);
    await createGroup(name().trim(), visible());
    setBusy(false);
    setName("");
    setVisible(false);
  }

  return (
    <div class="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        placeholder="Group name…"
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
        class="flex-1 bg-surface border border-rim text-txt rounded-lg px-3 py-2 text-sm
               hover:border-rim-strong focus:outline-none focus:border-accent"
      />
      <label class="flex items-center gap-2 text-sm text-muted cursor-pointer select-none px-1">
        <input
          type="checkbox"
          checked={visible()}
          onChange={(e) => setVisible(e.currentTarget.checked)}
          class="accent-[var(--accent)]"
        />
        Members visible
      </label>
      <button
        onClick={submit}
        disabled={busy() || !name().trim()}
        class="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-accent-fg
               text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity shrink-0"
      >
        <MdFillAdd size={16} />
        {busy() ? "Creating…" : "Create"}
      </button>
    </div>
  );
};

// ── Group row ─────────────────────────────────────────────────────────────────

const GroupRow: Component<{ group: PrivacyGroup }> = (props) => {
  const [deleteBusy, setDeleteBusy] = createSignal(false);

  async function handleDelete(e: Event) {
    e.preventDefault();
    if (!confirm(`Delete group "${props.group.name}"?`)) return;
    setDeleteBusy(true);
    await deleteGroup(props.group.id);
    setDeleteBusy(false);
  }

  async function toggleDefaultAcl(e: Event) {
    e.preventDefault();
    await updateGroup(props.group.id, { set_default_acl: !props.group.is_default_acl });
  }

  return (
    <div class="bg-surface border border-rim rounded-xl px-4 py-3 flex items-center gap-3">
      <span class="text-accent shrink-0">
        <MdFillGroup size={20} />
      </span>

      {/* Name + badges */}
      <div class="flex-1 min-w-0">
        <A
          href={`/directory/privacy-groups/${props.group.id}`}
          class="text-sm font-medium text-txt hover:text-accent truncate block"
        >
          {props.group.name}
        </A>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="flex items-center gap-1 text-xs text-muted">
            {props.group.visible
              ? <><MdFillVisibility size={11} />Visible</>
              : <><MdFillVisibility_off size={11} />Private</>}
          </span>
          <Show when={props.group.is_default_group}>
            <span class="text-xs text-accent">· default group</span>
          </Show>
          <Show when={props.group.is_default_acl}>
            <span class="text-xs text-accent">· default ACL</span>
          </Show>
        </div>
      </div>

      {/* Star = default ACL shortcut */}
      <button
        onClick={toggleDefaultAcl}
        title={props.group.is_default_acl ? "Remove default ACL" : "Set as default ACL"}
        class="text-muted hover:text-accent transition-colors"
      >
        {props.group.is_default_acl
          ? <MdFillStar size={17} class="text-accent" />
          : <MdFillStar_border size={17} />}
      </button>

      <A
        href={`/directory/privacy-groups/${props.group.id}`}
        class="text-xs border border-rim text-muted hover:bg-elevated rounded-lg px-3 py-1.5 transition-colors"
      >
        Edit
      </A>

      <button
        onClick={handleDelete}
        disabled={deleteBusy()}
        class="text-muted hover:text-red-500 disabled:opacity-40 transition-colors"
        title="Delete group"
      >
        <MdFillDelete size={17} />
      </button>
    </div>
  );
};

// ── View ──────────────────────────────────────────────────────────────────────

const PrivacyGroupsView: Component = () => {
  onMount(() => loadGroups());

  return (
    <SubPageContent
      title="Privacy Groups"
      description="Group your connections to control who sees each post."
      action={<CreateForm />}
    >
      <Show when={error()}>
        <p class="text-red-500 text-sm">{error()}</p>
      </Show>

      <Show
        when={!loading()}
        fallback={
          <div class="space-y-2">
            <For each={[1, 2, 3]}>
              {() => <div class="bg-surface border border-rim rounded-xl h-14 animate-pulse" />}
            </For>
          </div>
        }
      >
        <Show
          when={groups().length > 0}
          fallback={
            <p class="text-muted text-sm text-center py-10">
              No privacy groups yet. Create one above.
            </p>
          }
        >
          <div class="space-y-2">
            <For each={groups()}>{(g) => <GroupRow group={g} />}</For>
          </div>
        </Show>
      </Show>
    </SubPageContent>
  );
};

export default PrivacyGroupsView;
