// Cloud storage quota bar for the current page's channel, backed by
// GET /api/files/:nick/quota (view_storage-gated server-side, same as the
// Files app itself — a 403 here just means the widget renders nothing).

import { Show } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { apiFetch } from "@/shared/lib/fetch";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";

interface Quota {
  used: number;
  limit: number | null;
}

async function fetchQuota(nick: string): Promise<Quota | null> {
  if (!nick) return null;
  const res = await apiFetch(`/api/files/${nick}/quota`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as Quota;
}

function humanSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function StorageUsageWidget() {
  const nick = usePageNick();
  const { t } = useI18n();

  const [quota] = createQueryResource("storage-usage", () => nick(), fetchQuota);

  const pct = () => {
    const q = quota();
    if (!q?.limit) return null;
    return Math.min(100, Math.round((q.used / q.limit) * 100));
  };

  return (
    <Show when={!quota.loading && quota()}>
      <div class="bg-surface border border-rim rounded-xl p-4">
        <h3 class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          {t("widgets.storage_usage")}
        </h3>

        <Show when={pct() !== null}>
          <div class="h-2 rounded-full bg-elevated overflow-hidden">
            <div
              class="h-full rounded-full bg-accent transition-all"
              classList={{ "bg-red-500": (pct() ?? 0) >= 90 }}
              style={{ width: `${pct()}%` }}
            />
          </div>
        </Show>

        <p class="text-xs text-muted mt-2">
          <Show
            when={quota()!.limit}
            fallback={t("widgets.storage_used_only", { used: humanSize(quota()!.used) })}
          >
            {t("widgets.storage_used_of", {
              used: humanSize(quota()!.used),
              limit: humanSize(quota()!.limit!),
            })}
            {" "}({pct()}%)
          </Show>
        </p>
      </div>
    </Show>
  );
}
