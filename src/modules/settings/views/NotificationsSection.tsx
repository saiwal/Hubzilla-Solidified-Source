import { Show } from "solid-js";
import { useSectionForm } from "../store/useSectionForm";
import { fetchNotificationSettings, saveNotificationSettings } from "../api/api";
import { SectionDivider, SaveFooter } from "../views/Primitives";
import type { NotificationSettings } from "../store/types";

// Inline binary select to keep the form-data 0/1 pattern consistent
// (avoids the Toggle checkbox/hidden-input complexity for now)
function YesNo(props: { name: string; value: number }) {
  return (
    <select
      name={props.name}
      class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
    >
      <option value="1" selected={props.value === 1}>Yes</option>
      <option value="0" selected={props.value === 0}>No</option>
    </select>
  );
}

function Row(props: { label: string; hint?: string; children: any }) {
  return (
    <div class="flex items-center justify-between gap-4 py-1">
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{props.label}</span>
        {props.hint && (
          <span class="text-xs text-zinc-400 dark:text-zinc-500">{props.hint}</span>
        )}
      </div>
      {props.children}
    </div>
  );
}

export default function NotificationsSection() {
  const { data, saving, saveError, saveOk, handleSubmit } = useSectionForm({
    fetcher: fetchNotificationSettings,
    saver: saveNotificationSettings,
    numericFields: [
      "email_mentions",
      "email_connections",
      "email_digest",
      "notify_likes",
      "notify_shares",
      "notify_comments",
    ],
  });

  return (
    <Show when={data()} fallback={<p class="text-sm text-zinc-400">Loading…</p>}>
      {(s: () => NotificationSettings) => (
        <form onSubmit={handleSubmit} class="space-y-4">
          <SectionDivider label="Email" />

          <Row label="Mentions" hint="Email when someone mentions you">
            <YesNo name="email_mentions" value={s().email_mentions} />
          </Row>
          <Row label="New connections">
            <YesNo name="email_connections" value={s().email_connections} />
          </Row>
          <Row label="Weekly digest" hint="Summary of activity while you were away">
            <YesNo name="email_digest" value={s().email_digest} />
          </Row>

          <SectionDivider label="Activity" />

          <Row label="Likes">
            <YesNo name="notify_likes" value={s().notify_likes} />
          </Row>
          <Row label="Shares &amp; boosts">
            <YesNo name="notify_shares" value={s().notify_shares} />
          </Row>
          <Row label="Comments">
            <YesNo name="notify_comments" value={s().notify_comments} />
          </Row>

          <SaveFooter saving={saving()} saveOk={saveOk()} saveError={saveError()} />
        </form>
      )}
    </Show>
  );
}
