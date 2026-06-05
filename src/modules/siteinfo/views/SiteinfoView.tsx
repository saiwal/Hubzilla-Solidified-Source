import { createResource, Show, For } from "solid-js";
import { fetchSiteInfo } from "../api";
import { bbcode } from "@/shared/lib/bbcode";
import DOMPurify from "dompurify";
import { useI18n } from "@/i18n";

export default function SiteinfoView() {
  const { t } = useI18n();
  const [info] = createResource(fetchSiteInfo);

  return (
    <Show when={!info.loading} fallback={<SiteinfoPending />}>
      <Show when={info()} fallback={<p class="text-sm text-accent">{t("ui.siteinfo_load_failed")}</p>}>
        {(data) => (
          <div class="max-w-2xl mx-auto space-y-8">

            {/* Header card */}
            <div class="rounded-xl border border-rim bg-surface p-6">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-txt
                            flex items-center justify-center text-accent-fg text-lg font-bold shrink-0">
                  {data().site_name.charAt(0).toUpperCase()}
                </div>
                <div class="min-w-0">
                  <h1 class="text-xl font-bold text-txt truncate">
                    {data().site_name}
                  </h1>
                  <Show when={data().version}>
                    <p class="text-xs text-muted mt-0.5 font-mono">
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
              <Section title={t("ui.siteinfo_about")}>
                <div
                  class="prose prose-sm dark:prose-invert max-w-none text-txt
                           prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
                  innerHTML={DOMPurify.sanitize(bbcode(data().site_about))}
                />
              </Section>
            </Show>

            {/* Admin */}
            <Show when={data().admin_about}>
              <Section title={t("ui.siteinfo_admin")}>
                <div
                  class="prose prose-sm dark:prose-invert max-w-none text-txt
                           prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
                  innerHTML={DOMPurify.sanitize(bbcode(data().admin_about))}
                />
              </Section>
            </Show>

            {/* Federation */}
            <Section title={t("ui.siteinfo_federation")}>
              <div class="space-y-2">
                <p class="text-sm text-txt">
                  {t("ui.siteinfo_powered_by")}{" "}
                  <a
                    href={data().project_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-accent hover:underline"
                  >
                    Hubzilla
                  </a>
                  <Show when={data().project_src}>
                    {" · "}
                    <a
                      href={data().project_src}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-accent hover:underline"
                    >
                      {t("ui.siteinfo_source")}
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
                  <Section title={t("ui.siteinfo_addons")} compact>
                    <div class="flex flex-wrap gap-1.5">
                      <For each={data().addons}>
                        {(addon) => <Chip label={addon} />}
                      </For>
                    </div>
                  </Section>
                </Show>
                <Show when={data().themes.length > 0}>
                  <Section title={t("ui.siteinfo_themes")} compact>
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

// ── Sub-components ──────────────────────────────────────────────────────────

function Section(props: { title: string; children: any; compact?: boolean }) {
  return (
    <section class={`rounded-xl border border-rim
                     bg-surface ${props.compact ? 'p-4' : 'p-6'}`}>
      <h2 class="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
        {props.title}
      </h2>
      {props.children}
    </section>
  );
}

function Chip(props: { label: string; variant?: 'info' | 'default' }) {
  const cls = () => props.variant === 'info'
    ? 'bg-accent-muted text-accent'
    : 'bg-overlay text-muted';
  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls()}`}>
      {props.label}
    </span>
  );
}

function RegistrationBadge(props: { policy: 0 | 1 | 2 }) {
  const { t } = useI18n();
  const label = () =>
    props.policy === 1 ? t("ui.siteinfo_open_reg")
    : props.policy === 2 ? t("ui.siteinfo_approval")
    : t("ui.siteinfo_closed");

  const cls = () =>
    props.policy === 1
      ? "bg-accent-muted text-accent"
      : props.policy === 2
      ? "bg-accent-muted text-accent"
      : "bg-accent-muted text-accent";

  return (
    <span class={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls()}`}>
      {label()}
    </span>
  );
}

function SiteinfoPending() {
  return (
    <div class="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div class="rounded-xl border border-rim bg-surface p-6">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-xl bg-overlay shrink-0" />
          <div class="space-y-2 flex-1">
            <div class="h-5 w-48 rounded bg-overlay" />
            <div class="h-3 w-16 rounded bg-overlay" />
            <div class="h-5 w-24 rounded-md bg-overlay" />
          </div>
        </div>
      </div>
      <For each={Array(3).fill(0)}>
        {() => (
          <div class="rounded-xl border border-rim bg-surface p-6 space-y-3">
            <div class="h-3 w-20 rounded bg-overlay" />
            <div class="h-4 w-full rounded bg-overlay" />
            <div class="h-4 w-4/5 rounded bg-overlay" />
          </div>
        )}
      </For>
    </div>
  );
}
