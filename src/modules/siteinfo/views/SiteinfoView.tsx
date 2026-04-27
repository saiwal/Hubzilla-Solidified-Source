import { createResource, Show, For } from "solid-js";
import { fetchSiteInfo } from "../api";
import { bbcode } from "@/shared/lib/bbcode";
import DOMPurify from "dompurify";

export default function SiteinfoView() {
  const [info] = createResource(fetchSiteInfo);

  return (
    <Show when={!info.loading} fallback={<SiteinfoPending />}>
      <Show when={info()} fallback={<p class="text-sm text-red-500">Failed to load site info.</p>}>
        {(data) => (
          <div class="max-w-2xl mx-auto space-y-8">

            {/* Header card */}
            <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {data().site_name.charAt(0).toUpperCase()}
                </div>
                <div class="min-w-0">
                  <h1 class="text-xl font-bold text-txt truncate">
                    {data().site_name}
                  </h1>
                  <Show when={data().version}>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">
                      v{data().version}
                    </p>
                  </Show>
                  <div class="mt-2">
                    <RegistrationBadge policy={data().registration} />
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            <Show when={data().site_about}>
              <Section title="About this site">
                <div
                  class="prose dark:prose-invert max-w-none text-sm"
                  innerHTML={DOMPurify.sanitize(bbcode(data().site_about))}
                />
              </Section>
            </Show>

            {/* Admin */}
            <Show when={data().admin_about}>
              <Section title="Administrator">
                <div
                  class="prose dark:prose-invert max-w-none text-sm"
                  innerHTML={DOMPurify.sanitize(bbcode(data().admin_about))}
                />
              </Section>
            </Show>

            {/* Federation */}
            <Section title="Federation">
              <div class="space-y-2">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Powered by{" "}
                  <a
                    href={data().project_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Hubzilla
                  </a>
                  <Show when={data().project_src}>
                    {" · "}
                    <a
                      href={data().project_src}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Source code
                    </a>
                  </Show>
                </p>
                <Show when={data().federated.length > 0}>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <For each={data().federated}>
                      {(proto) => <Chip label={proto} variant="info" />}
                    </For>
                  </div>
                </Show>
              </div>
            </Section>

            {/* Addons + Themes side by side on wider screens */}
            <Show when={data().addons.length > 0 || data().themes.length > 0}>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Show when={data().addons.length > 0}>
                  <Section title="Addons" compact>
                    <div class="flex flex-wrap gap-1.5">
                      <For each={data().addons}>
                        {(addon) => <Chip label={addon} />}
                      </For>
                    </div>
                  </Section>
                </Show>
                <Show when={data().themes.length > 0}>
                  <Section title="Themes" compact>
                    <div class="flex flex-wrap gap-1.5">
                      <For each={data().themes}>
                        {(theme) => <Chip label={theme} />}
                      </For>
                    </div>
                  </Section>
                </Show>
              </div>
            </Show>

          </div>
        )}
      </Show>
    </Show>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section(props: { title: string; children: any; compact?: boolean }) {
  return (
    <section class={`rounded-xl border border-gray-100 dark:border-gray-800
                     bg-white dark:bg-gray-900 ${props.compact ? 'p-4' : 'p-6'}`}>
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

function Chip(props: { label: string; variant?: 'info' | 'default' }) {
  const cls = () => props.variant === 'info'
    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls()}`}>
      {props.label}
    </span>
  );
}

function RegistrationBadge(props: { policy: 0 | 1 | 2 }) {
  const label = () =>
    props.policy === 1 ? "Open registration"
    : props.policy === 2 ? "Approval required"
    : "Closed";

  const cls = () =>
    props.policy === 1
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      : props.policy === 2
      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";

  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls()}`}>
      {label()}
    </span>
  );
}

function SiteinfoPending() {
  return (
    <div class="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
          <div class="space-y-2 flex-1">
            <div class="h-5 w-48 rounded bg-gray-100 dark:bg-gray-800" />
            <div class="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            <div class="h-5 w-24 rounded-md bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
      <For each={Array(3).fill(0)}>
        {() => (
          <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-3">
            <div class="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
            <div class="h-4 w-full rounded bg-gray-100 dark:bg-gray-800" />
            <div class="h-4 w-4/5 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        )}
      </For>
    </div>
  );
}
