import { Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchNotificationSettings, saveNotificationSettings } from "../../api/api";
import { useSectionForm } from "../../store/useSectionForm";

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
  const { data, saving, handleSubmit } = useSectionForm({
    fetcher: fetchNotificationSettings,
    saver: saveNotificationSettings,
    numericFields: ["evdays", ...NOTIFY_FIELDS],
    checkboxFields: [...NOTIFY_FIELDS],
  });

  return (
    <SubPageContent title="Notifications" description="Email and visual notification preferences.">
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <form onSubmit={handleSubmit} class="space-y-8">

            {/* Activity auto-posts */}
            <Section title="Auto-post activity">
              <Toggle name="post_newfriend"      label="Accepting a friend request"             checked={!!d().post_newfriend} />
              <Toggle name="post_joingroup"      label="Joining a forum or community"           checked={!!d().post_joingroup} />
              <Toggle name="post_profilechange"  label="Making an interesting profile change"   checked={!!d().post_profilechange} />
            </Section>

            {/* Email notifications */}
            <Section title="Email notifications">
              <Toggle name="notify1" label="Connection request received"    checked={!!d().notify1} />
              <Toggle name="notify2" label="Connection confirmed"           checked={!!d().notify2} />
              <Toggle name="notify3" label="Someone posts on your wall"     checked={!!d().notify3} />
              <Toggle name="notify4" label="New followup comment"           checked={!!d().notify4} />
              <Toggle name="notify5" label="Private message received"       checked={!!d().notify5} />
              <Toggle name="notify6" label="Friend suggestion"              checked={!!d().notify6} />
              <Toggle name="notify7" label="Tagged in a post"               checked={!!d().notify7} />
              <Toggle name="notify8" label="Poked or prodded in a post"     checked={!!d().notify8} />
              <Toggle name="notify9" label="Someone liked your post"        checked={!!d().notify9} />
            </Section>

            {/* Visual notifications */}
            <Section title="Visual notifications">
              <Toggle name="vnotify1"  label="Unseen stream activity"       checked={!!d().vnotify1} />
              <Toggle name="vnotify2"  label="Unseen channel activity"      checked={!!d().vnotify2} />
              <Toggle name="vnotify3"  label="Unseen private messages"      checked={!!d().vnotify3} />
              <Toggle name="vnotify4"  label="Upcoming events"              checked={!!d().vnotify4} />
              <Toggle name="vnotify5"  label="Events today"                 checked={!!d().vnotify5} />
              <Toggle name="vnotify6"  label="Upcoming birthdays"           checked={!!d().vnotify6} />
              <Toggle name="vnotify7"  label="System notifications"         checked={!!d().vnotify7} />
              <Toggle name="vnotify8"  label="System info messages"         checked={!!d().vnotify8} />
              <Toggle name="vnotify9"  label="System critical alerts"       checked={!!d().vnotify9} />
              <Toggle name="vnotify10" label="New connections"              checked={!!d().vnotify10} />
              <Toggle name="vnotify12" label="Unseen shared files"          checked={!!d().vnotify12} />
              <Toggle name="vnotify14" label="Unseen likes and dislikes"    checked={!!d().vnotify14} />
              <Toggle name="vnotify15" label="Unseen forum posts"           checked={!!d().vnotify15} />
              <Show when={d().vnotify11}>
                <Toggle name="vnotify11" label="System registrations (admin)" checked={!!d().vnotify11} />
              </Show>
              <Show when={d().vnotify13 !== undefined}>
                <Toggle name="vnotify13" label="Unseen public stream activity" checked={!!d().vnotify13} />
              </Show>
            </Section>

            {/* Misc */}
            <Section title="Other">
              <Toggle name="always_show_in_notices"      label="Show new wall posts and messages under Notices"       checked={!!d().always_show_in_notices} />
              <Toggle name="update_notices_per_parent"   label="Mark entire thread read when clicking a notice"       checked={!!d().update_notices_per_parent} />
              <Field label="Event advance notice (days)" hint="Notify this many days before an upcoming event.">
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
                {saving() ? "Saving…" : "Save changes"}
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
