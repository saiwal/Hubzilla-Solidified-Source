import { createResource, For, Show } from "solid-js";
import { fetchConnections } from "@/modules/directory/connections/api";
import { useI18n } from "@/i18n";

type Contact = {
  name: string;
  photo: string;
  last_seen: string;
};

async function fetchRecentContacts(): Promise<Contact[]> {
  try {
    const { connections } = await fetchConnections({ filter: "recent", order: "recent", limit: 10 });
    return connections.map(c => ({ name: c.name, photo: c.photo, last_seen: "" }));
  } catch {
    return [];
  }
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function OnlineContactsWidget() {
  const { t } = useI18n();
  const [contacts] = createResource(fetchRecentContacts);

  return (
    <div class="bg-surface border border-rim rounded-xl p-4">
      <p class="text-xs font-medium text-muted uppercase tracking-wider mb-3">
        {t("ui.recently_active")}
      </p>
      <Show when={contacts.loading}>
        <p class="text-xs text-muted text-center py-2">{t("ui.loading")}</p>
      </Show>
      <Show when={!contacts.loading && (contacts()?.length ?? 0) === 0}>
        <p class="text-xs text-muted text-center py-2">{t("ui.no_recent_contacts")}</p>
      </Show>
      <For each={contacts()}>
        {(c) => (
          <div class="flex items-center gap-2 py-1.5">
            <Show
              when={c.photo}
              fallback={
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 bg-accent-muted text-accent-txt">
                  {initials(c.name)}
                </div>
              }
            >
              <img src={c.photo} alt={c.name} class="w-6 h-6 rounded-full shrink-0 object-cover" />
            </Show>
            <div class="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span class="text-sm text-txt truncate">{c.name}</span>
          </div>
        )}
      </For>
    </div>
  );
}
