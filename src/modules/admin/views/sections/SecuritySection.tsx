import { Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminSecurity, saveAdminSecurity } from "../../api";
import { useSectionForm } from "@/modules/settings/store/useSectionForm";
import type { AdminSecurity } from "../../types";

export default function SecuritySection() {
  const { data, saving, handleSubmit } = useSectionForm<AdminSecurity>({
    fetcher: fetchAdminSecurity,
    saver: saveAdminSecurity,
    checkboxFields: [
      "block_public", "cloud_disable_siteroot", "cloud_report_disksize",
      "embed_sslonly", "transport_security_header", "content_security_policy",
    ],
  });

  return (
    <SubPageContent
      title="Security"
      description="Access control, content filtering, and HTTP security headers."
      action={
        <Show when={data()}>
          <button
            form="security-form"
            type="submit"
            disabled={saving()}
            class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                   hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving() ? "Saving…" : "Save"}
          </button>
        </Show>
      }
    >
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <form id="security-form" onSubmit={handleSubmit} class="space-y-5">
            <Toggle name="block_public" label="Block public access" checked={d().block_public}
              hint="Require authentication to view any public personal pages." />
            <Toggle name="cloud_disable_siteroot" label="Provide cloud root directory" checked={!d().cloud_disable_siteroot}
              hint="List all channels that have public files." />
            <Toggle name="cloud_report_disksize" label="Show total disk space in cloud" checked={d().cloud_report_disksize} />

            <hr class="border-rim" />

            <Field label="Allowed email domains" hint="Comma-separated. Only these domains may register.">
              <textarea name="allowed_email" rows={2} class={inputCls}>{d().allowed_email}</textarea>
            </Field>
            <Field label="Blocked email domains" hint="Comma-separated. These domains are denied.">
              <textarea name="not_allowed_email" rows={2} class={inputCls}>{d().not_allowed_email}</textarea>
            </Field>

            <hr class="border-rim" />

            <Field label="Allowed sites (federation whitelist)" hint="One URL per line.">
              <textarea name="whitelisted_sites" rows={3} class={inputCls}>{d().whitelisted_sites}</textarea>
            </Field>
            <Field label="Blocked sites (federation blacklist)" hint="One URL per line.">
              <textarea name="blacklisted_sites" rows={3} class={inputCls}>{d().blacklisted_sites}</textarea>
            </Field>
            <Field label="Allowed channels">
              <textarea name="whitelisted_channels" rows={2} class={inputCls}>{d().whitelisted_channels}</textarea>
            </Field>
            <Field label="Blocked channels">
              <textarea name="blacklisted_channels" rows={2} class={inputCls}>{d().blacklisted_channels}</textarea>
            </Field>

            <hr class="border-rim" />

            <Toggle name="embed_sslonly" label="Only allow HTTPS embeds" checked={d().embed_sslonly} />
            <Field label="Allowed embed domains" hint="One URL per line — allow unfiltered HTML from these.">
              <textarea name="embed_allow" rows={3} class={inputCls}>{d().embed_allow}</textarea>
            </Field>
            <Field label="Blocked embed domains">
              <textarea name="embed_deny" rows={2} class={inputCls}>{d().embed_deny}</textarea>
            </Field>

            <hr class="border-rim" />

            <Toggle name="transport_security_header" label="Send Transport Security header (HSTS)" checked={d().transport_security_header} />
            <Toggle name="content_security_policy" label="Send Content Security Policy header" checked={d().content_security_policy} />

            <Field label="Trusted directory servers" hint="One URL per line.">
              <textarea name="trusted_directory_servers" rows={2} class={inputCls}>{d().trusted_directory_servers}</textarea>
            </Field>

          </form>
        )}
      </Show>
    </SubPageContent>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt text-sm " +
  "hover:border-rim-strong focus:outline-none focus:border-rim-strong transition-colors";

function Field(props: { label: string; hint?: string; children: any }) {
  return (
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-txt">{props.label}</label>
      {props.children}
      <Show when={props.hint}>
        <p class="text-xs text-muted">{props.hint}</p>
      </Show>
    </div>
  );
}

function Toggle(props: { name: string; label: string; checked: boolean; hint?: string }) {
  return (
    <div class="space-y-0.5">
      <label class="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" name={props.name} value="1" checked={props.checked} class="sr-only peer" />
        <div class="relative w-9 h-5 bg-rim-strong rounded-full peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-elevated after:transition-transform peer-checked:after:translate-x-4" />
        <span class="text-sm text-txt">{props.label}</span>
      </label>
      <Show when={props.hint}>
        <p class="ml-12 text-xs text-muted">{props.hint}</p>
      </Show>
    </div>
  );
}

function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      {Array.from({ length: 6 }, () => (
        <div class="space-y-1.5">
          <div class="h-3.5 w-32 rounded bg-elevated" />
          <div class="h-9 w-full rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}
