import { createSignal, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";
import {
  fetchBlockedChannels,
  blockChannel,
  unblockChannel,
  type BlockedChannel,
} from "@/shared/lib/blocklist-api";

export default function BlockedChannelsSection() {
  const { t } = useI18n();
  const [channels, { mutate }] = createQueryResource<BlockedChannel[]>(
    "blocklist",
    fetchBlockedChannels,
    { initialValue: [] },
  );

  const [addr, setAddr] = createSignal("");
  const [adding, setAdding] = createSignal(false);

  async function handleAdd(e: Event) {
    e.preventDefault();
    const value = addr().trim();
    if (!value || adding()) return;
    setAdding(true);
    try {
      await blockChannel(value);
      setAddr("");
      const fresh = await fetchBlockedChannels();
      mutate(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(t("blocklist.add_error")));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(hash: string) {
    const prev = channels() ?? [];
    mutate(prev.filter((c) => c.hash !== hash));
    try {
      await unblockChannel(hash);
    } catch (err) {
      mutate(prev);
      toast.error(err instanceof Error ? err.message : String(t("blocklist.remove_error")));
    }
  }

  return (
    <SubPageContent
      title={t("settings.title_blocked") as string}
      description={t("settings.desc_blocked") as string}
    >
      <form onSubmit={handleAdd} class="flex gap-2">
        <input
          type="text"
          value={addr()}
          onInput={(e) => setAddr(e.currentTarget.value)}
          placeholder={t("blocklist.add_placeholder") as string}
          class="flex-1 bg-surface border border-rim rounded-lg px-3 py-2 text-sm text-txt
                 focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!addr().trim() || adding()}
          class="text-xs px-3 py-2 rounded-lg bg-accent text-accent-fg hover:opacity-90
                 transition-opacity disabled:opacity-50"
        >
          {adding() ? t("blocklist.blocking") : t("blocklist.block")}
        </button>
      </form>

      <Show when={channels.loading}>
        <div class="space-y-2 animate-pulse">
          <For each={[1, 2, 3]}>{() => <div class="h-12 bg-elevated rounded-xl" />}</For>
        </div>
      </Show>

      <Show when={!channels.loading && (channels() ?? []).length === 0}>
        <div class="flex flex-col items-center gap-2 py-12 text-muted">
          <p class="text-sm font-medium">{t("blocklist.no_blocked")}</p>
          <p class="text-xs text-center max-w-xs">{t("blocklist.no_blocked_desc")}</p>
        </div>
      </Show>

      <div class="bg-surface border border-rim rounded-2xl overflow-hidden divide-y divide-rim">
        <For each={channels()}>
          {(c) => (
            <div class="flex items-center gap-3 px-4 py-3">
              <Show
                when={c.photo}
                fallback={
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-txt
                              shrink-0 flex items-center justify-center text-accent-fg text-xs font-bold">
                    {c.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                }
              >
                <img src={c.photo} width="32" height="32" class="w-8 h-8 rounded-full object-cover shrink-0" />
              </Show>
              <div class="min-w-0 flex-1">
                <div class="text-sm text-txt truncate">{c.name}</div>
                <div class="text-xs text-muted truncate">{c.address}</div>
              </div>
              <button
                onClick={() => void handleRemove(c.hash)}
                class="text-[11px] px-2.5 py-1 rounded-lg border border-rim text-muted
                       hover:border-red-500 hover:text-red-500 transition-colors shrink-0"
              >
                {t("blocklist.unblock")}
              </button>
            </div>
          )}
        </For>
      </div>
    </SubPageContent>
  );
}
