import { Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminSite, saveAdminSite } from "../../api/api";
import { useSectionForm } from "@/modules/settings/store/useSectionForm";
import type { AdminSite } from "../../api/types";

const REGISTER_POLICIES = [
  { value: 0, label: "No (closed)" },
  { value: 1, label: "Yes – with approval" },
  { value: 2, label: "Yes (open)" },
];

const ACCESS_POLICIES = [
  { value: 0, label: "Not a public server" },
  { value: 1, label: "Paid access only" },
  { value: 2, label: "Free access only" },
  { value: 3, label: "Free + optional paid upgrades" },
];

export default function SiteSection() {
  const { data, saving, saveError, saveOk, handleSubmit } = useSectionForm<AdminSite>({
    fetcher: fetchAdminSite,
    saver: saveAdminSite,
    numericFields: ["register_policy", "access_policy", "max_daily_registrations", "abandon_days", "maximagesize"],
    checkboxFields: ["login_on_homepage", "disable_discover_tab", "site_firehose", "open_pubstream"],
  });

  return (
    <SubPageContent
      title="Site"
      description="Site-wide configuration."
      action={
        <Show when={data()}>
          <button
            form="site-form"
            type="submit"
            disabled={saving()}
            class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-txt
                   hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving() ? "Saving…" : "Save"}
          </button>
        </Show>
      }
    >
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <form id="site-form" onSubmit={handleSubmit} class="space-y-5">
            <Field label="Site name">
              <input name="sitename" value={d().sitename} class={inputCls} />
            </Field>
            <Field label="Site location">
              <input name="site_location" value={d().site_location} class={inputCls} />
            </Field>
            <Field label="Banner text">
              <input name="banner" value={d().banner} class={inputCls} />
            </Field>
            <Field label="Admin info">
              <textarea name="admininfo" rows={3} class={inputCls}>{d().admininfo}</textarea>
            </Field>
            <Field label="Site info">
              <textarea name="siteinfo" rows={3} class={inputCls}>{d().siteinfo}</textarea>
            </Field>

            <hr class="border-rim" />

            <Field label="Registration policy">
              <select name="register_policy" class={inputCls}>
                {REGISTER_POLICIES.map((p) => (
                  <option value={p.value} selected={d().register_policy === p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Max daily registrations" hint="0 = unlimited">
              <input type="number" name="max_daily_registrations" value={d().max_daily_registrations} min={0} class={inputCls} />
            </Field>
            <Field label="Access policy">
              <select name="access_policy" class={inputCls}>
                {ACCESS_POLICIES.map((p) => (
                  <option value={p.value} selected={d().access_policy === p.value}>{p.label}</option>
                ))}
              </select>
            </Field>

            <hr class="border-rim" />

            <Field label="Directory server">
              <input name="directory_server" value={d().directory_server} class={inputCls} />
            </Field>
            <Field label="From email">
              <input type="email" name="from_email" value={d().from_email} class={inputCls} />
            </Field>
            <Field label="From email name">
              <input name="from_email_name" value={d().from_email_name} class={inputCls} />
            </Field>
            <Field label="Reply address">
              <input type="email" name="reply_address" value={d().reply_address} class={inputCls} />
            </Field>

            <hr class="border-rim" />

            <Toggle name="login_on_homepage" label="Show login on homepage" checked={d().login_on_homepage} />
            <Toggle name="site_firehose" label="Enable site firehose" checked={d().site_firehose} />
            <Toggle name="open_pubstream" label="Open public stream" checked={d().open_pubstream} />
            <Toggle name="disable_discover_tab" label="Disable discover tab" checked={d().disable_discover_tab} />

            <div class="flex items-center gap-3 pt-1">
              <Show when={saveOk()}>
                <span class="text-sm text-green-600">Saved ✓</span>
              </Show>
              <Show when={saveError()}>
                <span class="text-sm text-red-500">{saveError()}</span>
              </Show>
            </div>
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

function Toggle(props: { name: string; label: string; checked: boolean }) {
  return (
    <label class="flex items-center gap-3 cursor-pointer select-none">
      <input type="checkbox" name={props.name} value="1" checked={props.checked} class="sr-only peer" />
      <div class="relative w-9 h-5 bg-elevated rounded-full peer-checked:bg-accent transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
      <span class="text-sm text-txt">{props.label}</span>
    </label>
  );
}

function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      {Array.from({ length: 6 }, () => (
        <div class="space-y-1.5">
          <div class="h-3.5 w-24 rounded bg-elevated" />
          <div class="h-9 w-full rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}
