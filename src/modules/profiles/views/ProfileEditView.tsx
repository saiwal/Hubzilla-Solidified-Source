import { createResource, createSignal, lazy, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { useI18n } from "@/i18n";
import { toast } from "@/shared/store/toast";
import { fetchProfile, saveProfile, uploadPhoto } from "../api/api";
import { Section, Toggle, inputClass } from "@/modules/settings/store/FormHelpers";

// Lazy-loaded so Filerobot + React don't inflate the profile chunk
const ImageEditor = lazy(() => import("@/shared/views/ImageEditor"));

export default function ProfileEditView() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const [saving, setSaving] = createSignal(false);

  // Photo editor state
  const [avatarFile, setAvatarFile] = createSignal<File | null>(null);
  const [coverFile, setCoverFile] = createSignal<File | null>(null);
  const [avatarUrl, setAvatarUrl] = createSignal<string | null>(null);
  const [coverUrl, setCoverUrl] = createSignal<string | null>(null);
  const [avatarUploading, setAvatarUploading] = createSignal(false);
  const [coverUploading, setCoverUploading] = createSignal(false);

  const [profile] = createResource(() => params.id, async (id) => {
    const data = await fetchProfile(id);
    // Seed URL signals from initial profile data (bust cache on first load)
    if (data.avatar_l) setAvatarUrl(data.avatar_l + "?t=" + Date.now());
    if (data.cover_url) setCoverUrl(data.cover_url);
    return data;
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const raw: Record<string, string | number> = Object.fromEntries(fd) as Record<string, string>;
    raw.hide_friends = "hide_friends" in raw ? 1 : 0;

    setSaving(true);
    try {
      await saveProfile(params.id, raw);
      toast.success(t("profiles.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("profiles.save_error"));
    } finally {
      setSaving(false);
    }
  }

  function pickFile(type: "avatar" | "cover") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (type === "avatar") setAvatarFile(file);
      else setCoverFile(file);
    };
    input.click();
  }

  async function handleAvatarConfirm(blob: Blob) {
    setAvatarFile(null);
    setAvatarUploading(true);
    try {
      const res = await uploadPhoto("avatar", blob);
      if (res.avatar_l) setAvatarUrl(res.avatar_l);
      toast.success(t("profiles.avatar_saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("profiles.avatar_error"));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleCoverConfirm(blob: Blob) {
    setCoverFile(null);
    setCoverUploading(true);
    try {
      const res = await uploadPhoto("cover", blob);
      if (res.cover_url) setCoverUrl(res.cover_url);
      toast.success(t("profiles.cover_saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("profiles.cover_error"));
    } finally {
      setCoverUploading(false);
    }
  }

  return (
    <div class="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Back link */}
      <div class="flex items-center gap-3">
        <A
          href="/settings/profile"
          class="text-sm text-muted hover:text-txt transition-colors flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t("profiles.back")}
        </A>
      </div>

      <div class="space-y-0.5">
        <h2 class="text-base font-semibold text-txt">{t("profiles.edit_title")}</h2>
        <Show when={profile()}>
          <p class="text-sm text-muted">{profile()!.profile_name}</p>
        </Show>
      </div>

      <hr class="border-rim" />

      {/* Filerobot image editors — render their own full-screen overlay */}
      <Show when={avatarFile()}>
        {(file) => (
          <ImageEditor
            file={file()}
            aspect={1}
            circular={true}
            onConfirm={handleAvatarConfirm}
            onCancel={() => setAvatarFile(null)}
          />
        )}
      </Show>

      <Show when={coverFile()}>
        {(file) => (
          <ImageEditor
            file={file()}
            aspect={1200 / 435}
            circular={false}
            onConfirm={handleCoverConfirm}
            onCancel={() => setCoverFile(null)}
          />
        )}
      </Show>

      {/* Loading skeleton */}
      <Show when={profile.loading}>
        <FormSkeleton />
      </Show>

      {/* Error */}
      <Show when={profile.error}>
        <p class="text-sm text-muted">{t("profiles.load_error")}</p>
      </Show>

      {/* Form */}
      <Show when={profile()}>
        {(p) => (
          <form onSubmit={handleSubmit} class="space-y-8">

            {/* Cover + avatar header */}
            <div class="rounded-xl overflow-hidden border border-rim">
              {/* Cover photo */}
              <div
                class="relative w-full bg-elevated group"
                style="aspect-ratio: 1200/435"
              >
                <Show when={coverUrl()}>
                  {(url) => (
                    <img
                      src={url()}
                      alt=""
                      class="w-full h-full object-cover"
                    />
                  )}
                </Show>
                <Show when={!coverUrl() && !p().cover_url}>
                  <div class="w-full h-full bg-gradient-to-br from-elevated to-rim" />
                </Show>

                {/* Cover upload button */}
                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <button
                    type="button"
                    onClick={() => pickFile("cover")}
                    disabled={coverUploading()}
                    class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 text-white text-sm
                           hover:bg-black/80 transition-colors disabled:opacity-50"
                  >
                    <Show when={coverUploading()} fallback={<CameraIcon class="w-4 h-4" />}>
                      <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </Show>
                    {coverUploading() ? t("profiles.uploading") : t("profiles.change_cover")}
                  </button>
                </div>
              </div>

              {/* Avatar row */}
              <div class="flex items-end gap-3 px-4 -mt-10 pb-3">
                <div class="relative shrink-0 group">
                  <div class="w-20 h-20 rounded-full border-4 border-bg overflow-hidden bg-elevated">
                    <Show when={avatarUrl() || p().avatar_l}>
                      {(url) => (
                        <img
                          src={url()}
                          alt=""
                          class="w-full h-full object-cover"
                        />
                      )}
                    </Show>
                  </div>
                  {/* Avatar overlay button */}
                  <button
                    type="button"
                    onClick={() => pickFile("avatar")}
                    disabled={avatarUploading()}
                    class="absolute inset-0 rounded-full flex items-center justify-center
                           opacity-0 group-hover:opacity-100 transition-opacity
                           bg-black/50 disabled:cursor-not-allowed"
                    aria-label={t("profiles.change_avatar")}
                  >
                    <Show when={avatarUploading()} fallback={<CameraIcon class="w-5 h-5 text-white" />}>
                      <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </Show>
                  </button>
                </div>

                <div class="pb-1">
                  <p class="text-sm font-semibold text-txt leading-tight">{p().fullname || p().profile_name}</p>
                  <p class="text-xs text-muted">{p().pdesc}</p>
                </div>
              </div>
            </div>

            {/* Profile identity */}
            <Section title={t("profiles.group_basic")}>
              <Field label={t("profiles.profile_name_label")} hint={t("profiles.profile_name_hint")}>
                <input type="text" name="profile_name" value={p().profile_name} class={inputClass} />
              </Field>
              <Field label={t("profiles.fullname")}>
                <input type="text" name="fullname" value={p().fullname} class={inputClass} />
              </Field>
              <Field label={t("profiles.pdesc")}>
                <input type="text" name="pdesc" value={p().pdesc}
                  placeholder={t("profiles.pdesc_placeholder")} class={inputClass} />
              </Field>
              <Field label={t("profiles.about")} hint={t("profiles.about_hint")}>
                <textarea name="about" rows="4" class={`${inputClass} resize-y`}>
                  {p().about}
                </textarea>
              </Field>
              <Field label={t("profiles.keywords")} hint={t("profiles.keywords_hint")}>
                <input type="text" name="keywords" value={p().keywords} class={inputClass} />
              </Field>
              <Toggle
                name="hide_friends"
                label={t("profiles.hide_friends")}
                checked={!!p().hide_friends}
              />
            </Section>

            {/* Personal */}
            <Section title={t("profiles.group_personal")}>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("profiles.gender")}>
                  <input type="text" name="gender" value={p().gender} class={inputClass} />
                </Field>
                <Field label={t("profiles.dob")} hint={t("profiles.dob_hint")}>
                  <input type="text" name="dob" value={p().dob} class={inputClass} />
                </Field>
                <Field label={t("profiles.hometown")}>
                  <input type="text" name="hometown" value={p().hometown} class={inputClass} />
                </Field>
                <Field label={t("profiles.homepage")}>
                  <input type="url" name="homepage" value={p().homepage} class={inputClass} />
                </Field>
                <Field label={t("profiles.marital")}>
                  <input type="text" name="marital" value={p().marital} class={inputClass} />
                </Field>
                <Field label={t("profiles.sexual")}>
                  <input type="text" name="sexual" value={p().sexual} class={inputClass} />
                </Field>
                <Field label={t("profiles.politic")}>
                  <input type="text" name="politic" value={p().politic} class={inputClass} />
                </Field>
                <Field label={t("profiles.religion")}>
                  <input type="text" name="religion" value={p().religion} class={inputClass} />
                </Field>
              </div>
            </Section>

            {/* Interests */}
            <Section title={t("profiles.group_interests")}>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("profiles.interest")}>
                  <input type="text" name="interest" value={p().interest} class={inputClass} />
                </Field>
                <Field label={t("profiles.romance")}>
                  <input type="text" name="romance" value={p().romance} class={inputClass} />
                </Field>
                <Field label={t("profiles.likes")}>
                  <input type="text" name="likes" value={p().likes} class={inputClass} />
                </Field>
                <Field label={t("profiles.dislikes")}>
                  <input type="text" name="dislikes" value={p().dislikes} class={inputClass} />
                </Field>
              </div>
            </Section>

            {/* Culture */}
            <Section title={t("profiles.group_culture")}>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("profiles.music")}>
                  <input type="text" name="music" value={p().music} class={inputClass} />
                </Field>
                <Field label={t("profiles.book")}>
                  <input type="text" name="book" value={p().book} class={inputClass} />
                </Field>
                <Field label={t("profiles.tv")}>
                  <input type="text" name="tv" value={p().tv} class={inputClass} />
                </Field>
                <Field label={t("profiles.film")}>
                  <input type="text" name="film" value={p().film} class={inputClass} />
                </Field>
              </div>
            </Section>

            {/* Work & Education */}
            <Section title={t("profiles.group_work")}>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("profiles.employment")}>
                  <input type="text" name="employment" value={p().employment} class={inputClass} />
                </Field>
                <Field label={t("profiles.education")}>
                  <input type="text" name="education" value={p().education} class={inputClass} />
                </Field>
              </div>
            </Section>

            {/* Contact */}
            <Section title={t("profiles.group_contact")}>
              <Field label={t("profiles.contact")}>
                <input type="text" name="contact" value={p().contact} class={inputClass} />
              </Field>
              <Field label={t("profiles.channels")}>
                <input type="text" name="channels" value={p().channels} class={inputClass} />
              </Field>
            </Section>

            <div class="flex items-center gap-3 pt-2 border-t border-rim">
              <button
                type="submit"
                disabled={saving()}
                class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {saving() ? t("profiles.saving") : t("profiles.save")}
              </button>
              <Show when={!p().is_default}>
                <span class="text-xs text-muted">{t("profiles.profile_name_hint")}</span>
              </Show>
            </div>
          </form>
        )}
      </Show>
    </div>
  );
}

function CameraIcon(props: { class?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class={props.class}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
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

function FormSkeleton() {
  return (
    <div class="space-y-8 animate-pulse">
      <div class="rounded-xl overflow-hidden border border-rim">
        <div class="w-full bg-elevated" style="aspect-ratio: 1200/435" />
        <div class="flex gap-3 px-4 -mt-10 pb-3">
          <div class="w-20 h-20 rounded-full border-4 border-bg bg-elevated shrink-0" />
          <div class="space-y-2 pb-1 self-end">
            <div class="h-3.5 w-32 rounded bg-elevated" />
            <div class="h-3 w-20 rounded bg-elevated" />
          </div>
        </div>
      </div>
      {[...Array(3)].map(() => (
        <div class="space-y-3">
          <div class="h-3.5 w-24 rounded bg-elevated" />
          <div class="h-px w-full bg-rim" />
          <div class="grid grid-cols-2 gap-4">
            {[...Array(4)].map(() => (
              <div class="space-y-1.5">
                <div class="h-3 w-20 rounded bg-elevated" />
                <div class="h-9 w-full rounded-lg bg-elevated" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
