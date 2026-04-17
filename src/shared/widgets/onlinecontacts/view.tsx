import { createResource, For, Show } from "solid-js";

type Contact = {
  name: string;
  photo: string;
  last_seen: string;
};

async function fetchRecentContacts(): Promise<Contact[]> {
  const res = await fetch(
    "/connections-api?format=json&filter=recent&order=recent&limit=10"
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.connections ?? [];
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const COLORS = [
  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300",
  "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300",
];

function colorFor(name: string) {
  let n = 0;
  for (const c of name) n += c.charCodeAt(0);
  return COLORS[n % COLORS.length];
}

export default function OnlineContactsWidget() {
  const [contacts] = createResource(fetchRecentContacts);

  return (
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <p class="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Recently active
      </p>
      <Show when={contacts.loading}>
        <p class="text-xs text-gray-400 text-center py-2">Loading...</p>
      </Show>
      <Show when={!contacts.loading && (contacts()?.length ?? 0) === 0}>
        <p class="text-xs text-gray-400 text-center py-2">No recent contacts</p>
      </Show>
      <For each={contacts()}>
        {(c) => (
          <div class="flex items-center gap-2 py-1.5">
            <Show
              when={c.photo}
              fallback={
                <div class={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${colorFor(c.name)}`}>
                  {initials(c.name)}
                </div>
              }
            >
              <img src={c.photo} alt={c.name} class="w-6 h-6 rounded-full shrink-0 object-cover" />
            </Show>
            <div class="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span class="text-sm text-gray-800 dark:text-gray-200 truncate">{c.name}</span>
          </div>
        )}
      </For>
    </div>
  );
}
