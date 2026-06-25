import { createSignal, onMount, Show, For } from "solid-js";
import { useI18n } from "@/i18n";
import { MdFillLock, MdFillLock_open } from "solid-icons/md";
import type { AclData } from "../api/api";
import { fetchAcl, saveAcl } from "../api/api";

export default function AclEditor(props: {
  nick: string;
  type: "image" | "album";
  datum: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving]   = createSignal(false);
  const [error, setError]     = createSignal("");
  const [aclData, setAclData] = createSignal<AclData | null>(null);
  const [mode, setMode]       = createSignal<"public" | "custom">("public");
  const [allowGids, setAllowGids] = createSignal<string[]>([]);

  onMount(async () => {
    try {
      const data = await fetchAcl(props.nick, props.type, props.datum);
      setAclData(data);
      setAllowGids(data.allow_gid);
      setMode(data.allow_gid.length > 0 || data.allow_cid.length > 0 ? "custom" : "public");
    } catch {
      setError(t("photos.acl_error"));
    } finally {
      setLoading(false);
    }
  });

  function toggleGroup(id: string) {
    setAllowGids(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await saveAcl(props.nick, props.type, props.datum, {
        allow_gid: mode() === "public" ? [] : allowGids(),
        allow_cid: [],
        deny_gid:  [],
        deny_cid:  [],
      });
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("photos.acl_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="mt-3 p-3 bg-overlay rounded-xl border border-rim space-y-3">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide">
        {t("photos.acl_privacy")}
      </p>

      <Show when={loading()}>
        <p class="text-xs text-muted animate-pulse">{t("photos.acl_loading")}</p>
      </Show>

      <Show when={!loading()}>
        {/* Public / Restricted toggle */}
        <div class="flex items-center gap-2">
          <button
            onClick={() => setMode("public")}
            class={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                   ${mode() === "public"
                     ? "bg-accent text-accent-fg"
                     : "bg-surface text-muted hover:text-txt"}`}
          >
            <MdFillLock_open size={13} />
            {t("photos.acl_public")}
          </button>
          <button
            onClick={() => setMode("custom")}
            class={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                   ${mode() === "custom"
                     ? "bg-accent text-accent-fg"
                     : "bg-surface text-muted hover:text-txt"}`}
          >
            <MdFillLock size={13} />
            {t("photos.acl_custom")}
          </button>
        </div>

        {/* Groups (only when restricted mode) */}
        <Show when={mode() === "custom"}>
          <Show
            when={(aclData()?.groups.length ?? 0) > 0}
            fallback={
              <p class="text-xs text-muted">{t("photos.acl_no_groups")}</p>
            }
          >
            <div>
              <p class="text-xs text-muted mb-2">{t("photos.acl_groups")}:</p>
              <div class="flex flex-wrap gap-1.5">
                <For each={aclData()!.groups}>
                  {(group) => {
                    const active = () => allowGids().includes(group.id);
                    return (
                      <button
                        onClick={() => toggleGroup(group.id)}
                        class={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                               ${active()
                                 ? "bg-accent text-accent-fg"
                                 : "bg-surface text-muted hover:text-txt"}`}
                      >
                        {group.name}
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>
        </Show>

        <Show when={error()}>
          <p class="text-xs text-red-500">{error()}</p>
        </Show>

        <div class="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving()}
            class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium
                   transition-opacity disabled:opacity-40"
          >
            {saving() ? t("photos.acl_saving") : t("photos.acl_save")}
          </button>
          <button
            onClick={props.onClose}
            class="px-2 py-1.5 rounded-lg text-xs text-muted hover:text-txt transition-colors"
          >
            {t("photos.cancel")}
          </button>
        </div>
      </Show>
    </div>
  );
}
