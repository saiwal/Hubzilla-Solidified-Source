import { Show, For } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
import { useSectionForm } from "../../store/useSectionForm";
import { SaveBar, Toggle, Section } from "../../store/FormHelpers";
interface PermRow {
  key: string;
  label: string;
  value: number;
  help: string;
  options: Record<string, string>;
}

interface PrivacyData {
  permission_limits: boolean;
  permiss_arr: [string, string, number, string, Record<string, string>][];
  autoperms: number;
  index_opt_out: number;
  group_actor: number;
  permit_all_mentions: number;
  moderate_unsolicited_comments: number;
  ocap_enabled: number;
}

async function fetchPrivacy(): Promise<PrivacyData> {
  const res = await apiFetch("/api/settings/privacy");
  const { data } = await res.json();
  return data;
}

async function savePrivacy(payload: Partial<PrivacyData>): Promise<void> {
  const res = await apiFetch("/api/settings/privacy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message ?? "Save failed");
  }
}

const TOGGLE_FIELDS = [
  "autoperms", "index_opt_out", "group_actor",
  "permit_all_mentions", "moderate_unsolicited_comments", "ocap_enabled",
] as const;
function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      {[...Array(5)].map(() => (
        <div class="space-y-1.5">
          <div class="h-3.5 w-40 rounded bg-elevated" />
          <div class="h-9 w-full max-w-xs rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}
export default function PrivacySection() {
  const { data, saving, saveError, saveOk, handleSubmit } = useSectionForm({
    fetcher: fetchPrivacy,
    saver: savePrivacy,
    numericFields: [...TOGGLE_FIELDS],
    checkboxFields: [...TOGGLE_FIELDS],
  });

  const perms = (): PermRow[] =>
    (data()?.permiss_arr ?? []).map(([key, label, value, help, options]) => ({
      key, label, value, help, options,
    }));

  return (
    <SubPageContent title="Privacy" description="Control who can see and interact with your channel.">
      <Show when={data()} fallback={<Skeleton />}>
        <form onSubmit={handleSubmit} class="space-y-8">

          {/* Permission limits */}
          <Show when={data()!.permission_limits}>
            <Section title="Permission limits">
              <For each={perms()}>
                {(perm) => (
                  <div class="space-y-1">
                    <label class="block text-sm font-medium text-txt">{perm.label}</label>
                    <select
                      name={perm.key}
                      class="w-full max-w-xs px-3 py-2 rounded-lg border border-rim bg-surface
                             text-txt text-sm hover:border-rim-strong focus:outline-none
                             focus:border-rim-strong transition-colors"
                    >
                      <For each={Object.entries(perm.options)}>
                        {([val, label]) => (
                          <option value={val} selected={Number(val) === perm.value}>
                            {label}
                          </option>
                        )}
                      </For>
                    </select>
                    <Show when={perm.help}>
                      <p class="text-xs text-muted">{perm.help}</p>
                    </Show>
                  </div>
                )}
              </For>
            </Section>
          </Show>

          {/* Toggles */}
          <Section title="Advanced">
            <Toggle name="autoperms"                    label="Automatic permissions"                    hint="Automatically apply permissions to new connections."     checked={!!data()!.autoperms} />
            <Toggle name="permit_all_mentions"          label="Permit all mentions"                      hint="Allow anyone to mention you, even without a connection." checked={!!data()!.permit_all_mentions} />
            <Toggle name="moderate_unsolicited_comments" label="Moderate unsolicited comments"           hint="Hold comments from non-connections for approval."        checked={!!data()!.moderate_unsolicited_comments} />
            <Toggle name="index_opt_out"                label="Opt out of search indexing"              hint="Ask search engines and the directory not to index you."  checked={!!data()!.index_opt_out} />
            <Toggle name="group_actor"                  label="Act as a group/forum channel"                                                                           checked={!!data()!.group_actor} />
            <Toggle name="ocap_enabled"                 label="Enable object capabilities (ocap)"       hint="Experimental capability-based access control."           checked={!!data()!.ocap_enabled} />
          </Section>

          <SaveBar saving={saving()} saveOk={saveOk()} saveError={saveError()} />
        </form>
      </Show>
    </SubPageContent>
  );
}
