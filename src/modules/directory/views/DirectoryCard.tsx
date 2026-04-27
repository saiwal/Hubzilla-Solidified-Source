// modules/directory/views/DirectoryCard.tsx
import { Show, For, type Component } from "solid-js";
import { addConnection, type DirectoryEntry } from "../api";

interface Props {
  entry: DirectoryEntry;
  onSelect: (entry: DirectoryEntry) => void;
}

const DirectoryCard: Component<Props> = (props) => {

  const e = () => props.entry;
  const blurb = () => e().description || stripTags(e().about);
	async function handleAdd() {
		await addConnection(props.entry.address);
	}
  return (
    <div
      class="flex flex-col rounded-xl border border-rim bg-surface overflow-hidden hover:shadow-md hover:-translate-y-px transition-all duration-200 cursor-pointer group"
      onClick={() => props.onSelect(e())}
    >
      {/* ── Avatar + identity row ── */}
      <div class="flex items-center gap-3 p-4 pb-3">
        <div class="shrink-0">
          <img
            src={e().photo}
            alt={e().name}
            class="w-11 h-11 rounded-full object-cover bg-gray-100 dark:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-600"
            loading="lazy"
          />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="font-semibold text-sm text-txt truncate leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {e().name}
            </span>
            <Show when={e().common_count !== null && e().common_count! > 0}>
              <span class="shrink-0 ml-auto text-xs text-teal-600 dark:text-teal-400 font-medium whitespace-nowrap">
                {e().common_count} mutual
              </span>
            </Show>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {e().address}
          </p>
        </div>
      </div>

      {/* ── Public forum badge ── */}
      <Show when={e().public_forum}>
        <div class="mx-4 mb-2">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
            </svg>
            Public Forum
          </span>
        </div>
      </Show>

      {/* ── Blurb ── */}
      <div class="flex-1 px-4">
        <Show when={blurb()}>
          <p class="text-xs text-muted line-clamp-2 leading-relaxed">
            {blurb()}
          </p>
        </Show>
      </div>

      {/* ── Meta: location + keywords ── */}
      <div class="px-4 pt-2 pb-3 space-y-2">
        <Show when={e().location}>
          <p class="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
            <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {e().location}
          </p>
        </Show>
        <Show when={e().keywords.length > 0}>
          <div class="flex flex-wrap gap-1">
            <For each={e().keywords.slice(0, 4)}>
              {(kw) => (
                <span class="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-muted">
                  {kw}
                </span>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* ── Connect button — stopPropagation so it doesn't open modal ── */}
      <div
        class="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700 mt-auto"
        onClick={(ev) => ev.stopPropagation()}
      >
        <Show
          when={!e().is_connected}
          fallback={
            <span class="flex-1 text-center px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-default">
              ✓ Connected
            </span>
          }
        >
          <button
						onclick={handleAdd}
            class="flex-1 text-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {e().connect_url ? "Connect" : "View Profile"}
          </button>
        </Show>
        <Show when={e().ignore_url && !e().is_connected}>
         <a 
            href={e().ignore_url!}
            title="Ignore"
            class="p-1.5 rounded-lg border border-rim text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-elevated transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
          </a>
        </Show>
      </div>
    </div>
  );
};

export default DirectoryCard;

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
