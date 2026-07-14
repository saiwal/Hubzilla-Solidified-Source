/**
 * DMComposer.tsx
 * Modal direct-message composer — a slimmed-down PostComposer that swaps
 * the ACL picker for an always-visible "To:" recipient field (RecipientField).
 *
 * DMs are implicit on the backend: POST /api/item with scope:"custom",
 * contact_allow:[...], and no group_allow is auto-classified item_private=2
 * by Item.php — this already supports multiple recipients, so no backend
 * changes were needed. Groups are intentionally not selectable here, since
 * adding group_allow would break that auto-classification.
 */

import { createSignal, createEffect, onCleanup, Show, For, type Component } from "solid-js";
import { Portal } from "solid-js/web";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { fetchConnections, type AclEntry } from "@/modules/network/api";
import { entryKey } from "../components/AclPicker";
import RecipientField from "../components/RecipientField";
import { useMentionEmojiWiring } from "../mention/useMentionEmojiWiring";
import MentionEmojiPopups from "../mention/MentionEmojiPopups";
import { PrimarySubmitButton, ToggleButton, IconButton } from "../components/buttons";
import { helpable } from "@/shared/lib/helpable";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { currentNick } from "@/shared/store/auth-store";
import { bbcodeToInsert, patchInsertedAlt } from "../attachments/insertHelpers";
import { isFeatureEnabled } from "@/shared/store/auth-store";
import { useI18n } from "@/i18n";
import { getCsrfToken } from "@/shared/lib/csrf";
import { isEncryptedBody } from "@/shared/lib/postCrypto";
import { useEncrypt } from "../useEncrypt";
import EncryptPanel from "../components/EncryptPanel";
void helpable;

export interface DMComposerProps {
  open: boolean;
  onClose: () => void;
  /** Hubzilla channel_id of the sender (the local viewer's own channel). */
  profileUid: number;
  onSent?: (itemId: number) => void;
  /** Pre-seeded recipient(s) — e.g. the one contact known from a "Send DM" button. */
  initialRecipients?: AclEntry[];
  /** Override the draft/attachment scope key (default "dm:new"). */
  scopeKey?: string;
}

const DMComposer: Component<DMComposerProps> = (props) => {
  const { t } = useI18n();
  const caps = CAPABILITIES.dm;

  const scope = props.scopeKey ?? "dm:new";
  const attach = createAttachmentStore(currentNick(), scope);

  const [recipients, setRecipients] = createSignal<AclEntry[]>(props.initialRecipients ?? []);

  // Contacts who've granted the local channel the `post_mail` permission —
  // messages to anyone outside this set are silently dropped by the
  // recipient's hub before any delivery is even attempted. RecipientField's
  // search already filters to this set (ACL type "m"), but recipients seeded
  // directly via `initialRecipients` (Send DM from a profile/connection)
  // bypass that filter, so we check them here too.
  const [permittedXids, setPermittedXids] = createSignal<Set<string> | null>(null);
  void fetchConnections({ type: "m", count: 500 })
    .then((list) => setPermittedXids(new Set(list.map((c) => c.xid))))
    .catch(() => {});

  const unpermittedRecipients = () => {
    const permitted = permittedXids();
    if (!permitted) return [];
    return recipients().filter((r) => !permitted.has(r.xid));
  };

  function addRecipient(entry: AclEntry) {
    const key = entryKey(entry);
    if (recipients().some((r) => entryKey(r) === key)) return;
    setRecipients((prev) => [...prev, entry]);
  }

  function removeRecipient(entry: AclEntry) {
    const key = entryKey(entry);
    setRecipients((prev) => prev.filter((r) => entryKey(r) !== key));
  }

  const store = createComposerStore(async (body, meta) => {
    if (recipients().length === 0) {
      throw new Error(t("editor.dm_recipient_required"));
    }
    const blocked = unpermittedRecipients();
    if (blocked.length > 0) {
      throw new Error(
        t("editor.dm_recipient_not_permitted", { name: blocked.map((r) => r.name).join(", ") }),
      );
    }

    const fileTags = attach.attachments()
      .filter((a) => a.status === "ready" && !a.isImage && (a.hash || a.resourceId))
      .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
      .join("\n");
    const augmentedBody = fileTags ? `${body}\n${fileTags}` : body;

    const csrf = await getCsrfToken();
    const payload = {
      body: augmentedBody,
      mimetype: meta.mimetype ?? "text/bbcode",
      profile_uid: props.profileUid,
      scope: "custom",
      contact_allow: recipients().map((r) => r.xid),
      group_allow: [] as string[],
      contact_deny: [] as string[],
      group_deny: [] as string[],
    };

    const res = await fetch("/api/item", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json().catch(() => ({}))) as {
      data?: { post?: { iid?: number } };
    };
    if (!json.data?.post) {
      throw new Error("Server reported failure. Check Hubzilla logs.");
    }

    props.onSent?.(json.data.post.iid ?? 0);
    attach.clear();
    props.onClose();
  }, scope);

  const enc = useEncrypt(() => store.body(), store.setBody);

  // ── Mention + emoji autocomplete ──────────────────────────────────────────
  const wiring = useMentionEmojiWiring({
    body: store.body,
    setBody: store.setBody,
    mimetype: store.mimetype,
  });

  function onKey(e: KeyboardEvent) {
    if (wiring.onKeyDown(e)) return;
    if (e.key === "Escape") {
      props.onClose();
      return;
    }
    if (e.ctrlKey && e.key === "Enter") {
      void store.submit();
    }
  }

  createEffect(() => {
    if (props.open) document.addEventListener("keydown", onKey);
    else document.removeEventListener("keydown", onKey);
  });
  onCleanup(() => document.removeEventListener("keydown", onKey));

  return (
    <Show when={props.open}>
      <Portal mount={document.body}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          use:helpable="shared/dm-composer"
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onClose();
          }}
        >
          <div
            class="flex flex-col bg-surface border border-rim shadow-2xl text-txt
                   overflow-hidden w-full max-w-2xl h-[80vh] rounded-xl"
            role="dialog"
            aria-modal="true"
            aria-label={t("editor.dm_new_message")}
          >
            {/* ── Header ── */}
            <header class="flex items-center justify-between px-4 py-3 border-b border-rim shrink-0">
              <span class="text-xs font-semibold tracking-widest uppercase text-muted select-none">
                {t("editor.dm_new_message")}
              </span>
              <IconButton title={t("editor.close_esc")} onClick={props.onClose}>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </IconButton>
            </header>

            {/* ── To: field ── */}
            <div class="px-4 pt-3 pb-2 border-b border-rim shrink-0">
              <RecipientField
                entries={recipients}
                onAdd={addRecipient}
                onRemove={removeRecipient}
              />
              <Show when={unpermittedRecipients().length > 0}>
                <ul class="mt-1.5 space-y-0.5">
                  <For each={unpermittedRecipients()}>
                    {(r) => (
                      <li class="text-xs text-red-500">
                        {t("editor.dm_recipient_not_permitted", { name: r.name })}
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>

            {/* ── Editor area (flex-1) ── */}
            <div ref={wiring.wrapperRef} class="flex-1 overflow-hidden min-h-0 flex flex-col">
              <RichEditor
                body={store.body()}
                onInput={store.setBody}
                capabilities={caps}
                tab={store.tab()}
                onTabChange={store.setTab}
                mimetype={store.mimetype()}
                onCtrlEnter={() => { if (!wiring.mention.open()) void store.submit(); }}
                onPasteFiles={(files) => attach.addUploads(files)}
                placeholder={t("editor.write_placeholder")}
                minHeight="160px"
              />
              <AttachmentBar
                store={attach}
                nick={currentNick()}
                accept="both"
                onInsert={(bbcode) => {
                  store.setBody(store.body() + "\n" + bbcodeToInsert(bbcode, store.mimetype()));
                }}
                onAltChange={(att) => {
                  store.setBody(patchInsertedAlt(store.body(), att, store.mimetype()));
                }}
              />
            </div>

            {/* ── Encrypt panel ── */}
            <Show when={enc.open()}>
              <EncryptPanel enc={enc} />
            </Show>

            {/* ── Footer ── */}
            <footer class="flex flex-wrap items-center gap-2 px-3.5 py-2.5 border-t border-rim bg-elevated shrink-0">
              {/* Encrypt toggle — gated behind Settings → Features → Content Encryption */}
              <Show when={isFeatureEnabled("content_encrypt")}>
                <Show
                  when={!isEncryptedBody(store.body())}
                  fallback={
                    <span class="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs border bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                      🔒 {t("editor.encrypt_badge")}
                    </span>
                  }
                >
                  <ToggleButton
                    active={enc.open()}
                    onClick={() => enc.setOpen((o) => !o)}
                    title={t("editor.encrypt_toggle")}
                  >
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {t("editor.encrypt_toggle")}
                  </ToggleButton>
                </Show>
              </Show>

              <div class="ml-auto">
                <PrimarySubmitButton
                  disabled={
                    store.submitting() ||
                    attach.uploading() ||
                    recipients().length === 0 ||
                    unpermittedRecipients().length > 0 ||
                    !store.body().trim()
                  }
                  onClick={() => void store.submit()}
                >
                  {store.submitting() ? t("editor.sending_dm") : t("editor.send_btn")}
                </PrimarySubmitButton>
              </div>
            </footer>
          </div>
        </div>

        <MentionEmojiPopups wiring={wiring} />
      </Portal>
    </Show>
  );
};

export default DMComposer;
