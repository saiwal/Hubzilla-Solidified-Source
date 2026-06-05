import { Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchNotificationSettings, saveNotificationSettings } from "../../api/api";
import { useSectionForm } from "../../store/useSectionForm";
import { useI18n } from "@/i18n";

const NOTIFY_FIELDS = [
  "notify1","notify2","notify3","notify4","notify5",
  "notify6","notify7","notify8","notify9",
  "vnotify1","vnotify2","vnotify3","vnotify4","vnotify5",
  "vnotify6","vnotify7","vnotify8","vnotify9","vnotify10",
  "vnotify11","vnotify12","vnotify13","vnotify14","vnotify15",
  "post_newfriend","post_joingroup","post_profilechange",
  "always_show_in_notices","update_notices_per_parent",
] as const;

export default function NotificationsSection() {
  const { t } = useI18n();
  const { data, saving, handleSubmit } = useSectionForm({
    fetcher: fetchNotificationSettings,
    saver: saveNotificationSettings,
    numericFields: ["evdays", ...NOTIFY_FIELDS],
    checkboxFields: [...NOTIFY_FIELDS],
  });

  return (
    <SubPageContent title={t("settings.title_notifications")} description={t("settings.desc_notifications")}>
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <form onSubmit={handleSubmit} class="space-y-8">

            {/* Activity auto-posts */}
            <Section title={t("settings.notif_autopost_title")}>
              <Toggle name="post_newfriend"      label={t("settings.notif_friend_request")}  checked={!!d().post_newfriend} />
              <Toggle name="post_joingroup"      label={t("settings.notif_join_forum")}       checked={!!d().post_joingroup} />
              <Toggle name="post_profilechange"  label={t("settings.notif_profile_change")}   checked={!!d().post_profilechange} />
            </Section>

            {/* Email notifications */}
            <Section title={t("settings.notif_email_title")}>
              <Toggle name="notify1" label={t("settings.notif_email_conn_req")}        checked={!!d().notify1} />
              <Toggle name="notify2" label={t("settings.notif_email_conn_confirmed")}  checked={!!d().notify2} />
              <Toggle name="notify3" label={t("settings.notif_email_wall_post")}       checked={!!d().notify3} />
              <Toggle name="notify4" label={t("settings.notif_email_followup")}        checked={!!d().notify4} />
              <Toggle name="notify5" label={t("settings.notif_email_private")}         checked={!!d().notify5} />
              <Toggle name="notify6" label={t("settings.notif_email_friend_suggest")}  checked={!!d().notify6} />
              <Toggle name="notify7" label={t("settings.notif_email_tagged")}          checked={!!d().notify7} />
              <Toggle name="notify8" label={t("settings.notif_email_poked")}           checked={!!d().notify8} />
              <Toggle name="notify9" label={t("settings.notif_email_liked")}           checked={!!d().notify9} />
            </Section>

            {/* Visual notifications */}
            <Section title={t("settings.notif_visual_title")}>
              <Toggle name="vnotify1"  label={t("settings.notif_visual_stream")}         checked={!!d().vnotify1} />
              <Toggle name="vnotify2"  label={t("settings.notif_visual_channel")}        checked={!!d().vnotify2} />
              <Toggle name="vnotify3"  label={t("settings.notif_visual_private")}        checked={!!d().vnotify3} />
              <Toggle name="vnotify4"  label={t("settings.notif_visual_events")}         checked={!!d().vnotify4} />
              <Toggle name="vnotify5"  label={t("settings.notif_visual_events_today")}   checked={!!d().vnotify5} />
              <Toggle name="vnotify6"  label={t("settings.notif_visual_birthdays")}      checked={!!d().vnotify6} />
              <Toggle name="vnotify7"  label={t("settings.notif_visual_system")}         checked={!!d().vnotify7} />
              <Toggle name="vnotify8"  label={t("settings.notif_visual_system_info")}    checked={!!d().vnotify8} />
              <Toggle name="vnotify9"  label={t("settings.notif_visual_system_critical")} checked={!!d().vnotify9} />
              <Toggle name="vnotify10" label={t("settings.notif_visual_connections")}    checked={!!d().vnotify10} />
              <Toggle name="vnotify12" label={t("settings.notif_visual_files")}          checked={!!d().vnotify12} />
              <Toggle name="vnotify14" label={t("settings.notif_visual_likes")}          checked={!!d().vnotify14} />
              <Toggle name="vnotify15" label={t("settings.notif_visual_forum")}          checked={!!d().vnotify15} />
              <Show when={d().vnotify11}>
                <Toggle name="vnotify11" label={t("settings.notif_visual_registrations")} checked={!!d().vnotify11} />
              </Show>
              <Show when={d().vnotify13 !== undefined}>
                <Toggle name="vnotify13" label={t("settings.notif_visual_pubstream")}    checked={!!d().vnotify13} />
              </Show>
            </Section>

            {/* Misc */}
            <Section title={t("settings.notif_other_title")}>
              <Toggle name="always_show_in_notices"    label={t("settings.notif_show_in_notices")}  checked={!!d().always_show_in_notices} />
              <Toggle name="update_notices_per_parent" label={t("settings.notif_mark_thread_read")} checked={!!d().update_notices_per_parent} />
              <Field label={t("settings.notif_event_advance_days")} hint={t("settings.notif_event_advance_hint")}>
                <input
                  type="number"
                  name="evdays"
                  min="1"
                  max="30"
                  value={d().evdays}
                  class="w-20 px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                         hover:border-rim-strong focus:outline-none focus:border-rim-strong
                         transition-colors text-sm"
                />
              </Field>
            </Section>

            <div class="flex items-center gap-3 pt-2 border-t border-rim">
              <button
                type="submit"
                disabled={saving()}
                class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {saving() ? t("settings.saving") : t("settings.save")}
              </button>
            </div>

          </form>
        )}
      </Show>
    </SubPageContent>
  );
}

function Section(props: { title: string; children: any }) {
  return (
    <div class="space-y-3">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">{props.title}</h3>
      <div class="space-y-2.5">{props.children}</div>
    </div>
  );
}

function Toggle(props: { name: string; label: string; hint?: string; checked: boolean }) {
  return (
    <label class="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        name={props.name}
        value="1"
        checked={props.checked}
        class="mt-0.5 h-4 w-4 rounded border-rim accent-accent cursor-pointer"
      />
      <span class="flex-1 min-w-0">
        <span class="block text-sm text-txt">{props.label}</span>
        <Show when={props.hint}>
          <span class="block text-xs text-muted">{props.hint}</span>
        </Show>
      </span>
    </label>
  );
}

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

function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      {[...Array(6)].map(() => (
        <div class="flex gap-3 items-center">
          <div class="h-4 w-4 rounded bg-elevated" />
          <div class="h-3.5 w-48 rounded bg-elevated" />
        </div>
      ))}
    </div>
  );
}
