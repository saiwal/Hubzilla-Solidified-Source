// src/modules/siteinfo/views/SiteinfoView.tsx

import { createResource, Show, For } from "solid-js";
import { fetchSiteInfo } from "../api";
import { bbcode } from "@/shared/lib/bbcode";
import DOMPurify from "dompurify";

export default function SiteinfoView() {
const [info] = createResource(fetchSiteInfo);

	return (
    <Show when={!info.loading} fallback={<SiteinfoPending />}>
      <Show when={info()} fallback={<p class="text-red-500">Failed to load site info.</p>}>
        {(data) => (
          <div class="max-w-2xl mx-auto space-y-8">

            {/* Site name + version */}
            <div>
              <h1 class="text-2xl font-bold">{data().site_name}</h1>
              <Show when={data().version}>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Version {data().version}
                </p>
              </Show>
              <RegistrationBadge policy={data().registration} />
            </div>

            {/* About */}
            <Show when={data().site_about}>
              <section>
                <h2 class="text-lg font-semibold mb-2">About this site</h2>
                <div
                  class="prose dark:prose-invert max-w-none text-sm"
                  innerHTML={DOMPurify.sanitize(bbcode(data().site_about))}
                />
              </section>
            </Show>

            {/* Admin */}
            <Show when={data().admin_about}>
              <section>
                <h2 class="text-lg font-semibold mb-2">Administrator</h2>
                <div
                  class="prose dark:prose-invert max-w-none text-sm"
                  innerHTML={DOMPurify.sanitize(bbcode(data().admin_about))}
                />
              </section>
            </Show>

            {/* Federation */}
            <section>
              <h2 class="text-lg font-semibold mb-2">Federation</h2>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Powered by{" "}
               <a 
                  href={data().project_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="underline hover:text-blue-600"
                >
                  Hubzilla
                </a>
                <Show when={data().project_src}>
                  {" · "}
                 <a 
                    href={data().project_src}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline hover:text-blue-600"
                  >
                    Source
                  </a>
                </Show>
              </p>
              <Show when={data().federated.length > 0}>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Additional protocols: {data().federated.join(", ")}
                </p>
              </Show>
            </section>

            {/* Addons */}
            <Show when={data().addons.length > 0}>
              <section>
                <h2 class="text-lg font-semibold mb-2">Active addons</h2>
                <div class="flex flex-wrap gap-2">
                  <For each={data().addons}>
                    {(addon) => (
                      <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {addon}
                      </span>
                    )}
                  </For>
                </div>
              </section>
            </Show>

            {/* Themes */}
            <Show when={data().themes.length > 0}>
              <section>
                <h2 class="text-lg font-semibold mb-2">Active themes</h2>
                <div class="flex flex-wrap gap-2">
                  <For each={data().themes}>
                    {(theme) => (
                      <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {theme}
                      </span>
                    )}
                  </For>
                </div>
              </section>
            </Show>

          </div>
        )}
      </Show>
    </Show>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RegistrationBadge(props: { policy: 0 | 1 | 2 }) {
  const label = () =>
    props.policy === 1 ? "Open registration"
    : props.policy === 2 ? "Registration by approval"
    : "Closed registration";

  const cls = () =>
    props.policy === 1
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
      : props.policy === 2
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";

  return (
    <span class={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${cls()}`}>
      {label()}
    </span>
  );
}

function SiteinfoPending() {
  return (
    <div class="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div class="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      <div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      <div class="space-y-2">
        <div class="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div class="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div class="h-4 w-4/6 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
