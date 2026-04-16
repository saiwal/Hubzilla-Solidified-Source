// modules/directory/views/DirectoryCard.tsx

import { Show, For } from "solid-js";
import type { DirectoryEntry } from "../api";

interface Props {
  entry: DirectoryEntry;
}

export default function DirectoryCard(props: Props) {
  const e = () => props.entry;

  return (
    <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3 hover:shadow-sm transition-shadow">
      {/* ── Avatar + name ── */}
      <div class="flex items-start gap-3">
        <a href={e().profile_url} target="_blank" rel="noopener noreferrer" class="shrink-0">
          <img
            src={e().photo}
            alt={e().name}
            class="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-700"
            loading="lazy"
          />
        </a>
        <div class="min-w-0 flex-1">
          <a
            href={e().profile_url}
            target="_blank"
            rel="noopener noreferrer"
            class="block font-semibold text-gray-900 dark:text-gray-100 truncate hover:underline"
          >
            {e().name}
            <Show when={e().public_forum}>
              <span class="ml-1 text-xs font-normal text-blue-500" title="Public forum">📋</span>
            </Show>
          </a>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
            {e().address}
          </p>
        </div>
      </div>

      {/* ── Description / about ── */}
      <Show when={e().description || e().about}>
        <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
          {e().description || stripTags(e().about)}
        </p>
      </Show>

      {/* ── Location ── */}
      <Show when={e().location}>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          📍 {e().location}
        </p>
      </Show>

      {/* ── Keywords ── */}
      <Show when={e().keywords.length > 0}>
        <div class="flex flex-wrap gap-1">
          <For each={e().keywords.slice(0, 5)}>
            {(kw) => (
              <span class="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {kw}
              </span>
            )}
          </For>
        </div>
      </Show>

      {/* ── Common connections (suggest mode) ── */}
      <Show when={e().common_count !== null && e().common_count! > 0}>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          ~{e().common_count} common connections
        </p>
      </Show>

      {/* ── Actions ── */}
      <div class="flex items-center gap-2 pt-1">
        <Show when={e().connect_url}>
          <a
            href={e().connect_url}
            class="flex-1 text-center px-3 py-1.5 rounded-lg text-xs font-medium
                   bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Connect
          </a>
        </Show>
        <Show when={e().is_connected}>
          <span class="flex-1 text-center px-3 py-1.5 rounded-lg text-xs font-medium
                       border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
            Connected
          </span>
        </Show>
        <Show when={e().ignore_url}>
          <a
            href={e().ignore_url!}
            class="px-3 py-1.5 rounded-lg text-xs font-medium
                   border border-gray-200 dark:border-gray-700
                   text-gray-500 dark:text-gray-400
                   hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Ignore
          </a>
        </Show>
      </div>
    </div>
  );
}

// Strip HTML tags for plain-text preview of bbcode-rendered about field
function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
