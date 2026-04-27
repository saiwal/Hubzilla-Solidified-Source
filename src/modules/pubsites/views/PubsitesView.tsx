import { createResource, For, Show } from 'solid-js';
import { fetchPubsites, type PubSite } from '../api';

export default function PubsitesView() {
  const [sites] = createResource(fetchPubsites);

  return (
    <div class="max-w-4xl mx-auto space-y-4">
      <h1 class="text-2xl font-bold">Public Hubs</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        These hubs allow public registration on the network. All hubs are interlinked — joining any gives you membership across the whole network.
      </p>

      <Show when={sites.loading}>
        <div class="space-y-2">
          <For each={Array(6).fill(0)}>
            {() => <div class="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />}
          </For>
        </div>
      </Show>

      <Show when={!sites.loading && sites()?.length === 0}>
        <p class="text-gray-500 text-center py-12">No public hubs found.</p>
      </Show>

      <Show when={!sites.loading && (sites()?.length ?? 0) > 0}>
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              <tr>
                <th class="text-left px-4 py-3 font-medium">Hub</th>
                <th class="text-left px-4 py-3 font-medium">Access</th>
                <th class="text-left px-4 py-3 font-medium">Registration</th>
                <th class="text-left px-4 py-3 font-medium">Software</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <For each={sites()}>
                {(site: PubSite) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td class="px-4 py-3">
                     <a 
                        href={site.sellpage ?? `${site.register_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {site.urltext}
                      </a>
                      <Show when={site.location}>
                        <p class="text-xs text-gray-400 mt-0.5">{site.location}</p>
                      </Show>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{site.access}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{site.register}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {site.project}{site.version ? ` ${site.version}` : ''}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
}
