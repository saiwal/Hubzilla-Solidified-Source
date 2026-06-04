import { Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
import { useSectionForm } from "../../store/useSectionForm";
import { SaveBar } from "../../store/FormHelpers";

interface ProfileData {
  name: string;
  pdesc: string;
  homepage: string;
  hometown: string;
  gender: string;
  birthday: string;
  about: string;
  keywords: string;
  hide_friends: number;
}

async function fetchProfile(): Promise<ProfileData> {
  const res = await apiFetch("/api/settings/profile");
  const { data } = await res.json();
  return data;
}

async function saveProfile(payload: Partial<ProfileData>): Promise<void> {
  const res = await apiFetch("/api/settings/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message ?? "Save failed");
  }
}

export default function ProfileSection() {
  const { data, saving, handleSubmit } = useSectionForm({
    fetcher: fetchProfile,
    saver: saveProfile,
    numericFields: ["hide_friends"],
    checkboxFields: ["hide_friends"],
  });

  return (
    <SubPageContent title="Profile" description="Your public profile information.">
      <Show when={data()} fallback={<Skeleton />}>
        <form onSubmit={handleSubmit} class="space-y-5">

          <Field label="Display name">
            <input type="text" name="name" value={data()!.name}
              class={input} />
          </Field>

          <Field label="Short description">
            <input type="text" name="pdesc" value={data()!.pdesc}
              placeholder="e.g. developer, photographer…"
              class={input} />
          </Field>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Hometown">
              <input type="text" name="hometown" value={data()!.hometown} class={input} />
            </Field>
            <Field label="Gender">
              <input type="text" name="gender" value={data()!.gender} class={input} />
            </Field>
            <Field label="Birthday" hint="YYYY-MM-DD or MM-DD">
              <input type="text" name="birthday" value={data()!.birthday} class={input} />
            </Field>
            <Field label="Homepage">
              <input type="url" name="homepage" value={data()!.homepage} class={input} />
            </Field>
          </div>

          <Field label="About" hint="Supports BBCode.">
            <textarea
              name="about"
              rows="4"
              class={`${input} resize-y`}
            >
              {data()!.about}
            </textarea>
          </Field>

          <Field label="Keywords" hint="Comma-separated. Used for search and suggestions.">
            <input type="text" name="keywords" value={data()!.keywords} class={input} />
          </Field>

          <label class="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="hide_friends"
              value="1"
              checked={!!data()!.hide_friends}
              class="h-4 w-4 rounded border-rim accent-accent"
            />
            <span class="text-sm text-txt">Hide my connections list from others</span>
          </label>

          <SaveBar saving={saving()} />
        </form>
      </Show>
    </SubPageContent>
  );
}

const input = `w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt text-sm
  placeholder:text-muted hover:border-rim-strong focus:outline-none
  focus:border-rim-strong transition-colors`;

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
    <div class="space-y-5 animate-pulse">
      {[...Array(5)].map(() => (
        <div class="space-y-1.5">
          <div class="h-3.5 w-28 rounded bg-elevated" />
          <div class="h-9 w-full rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}
