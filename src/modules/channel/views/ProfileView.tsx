// src/modules/channel/views/ProfileView.tsx
import { createResource, Show, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { useViewerRole } from "@/shared/store/site-config";
import { MdFillLocation_on, MdFillPublic } from "solid-icons/md";
import { apiFetch } from "@/shared/lib/fetch";
import { useI18n } from "@/i18n";

type ChannelProfile = {
  channel_name: string;
  channel_address: string;
  channel_photo_l: string;
  channel_cover: string;
  pdesc: string;
  about: string;
  location: string;
  homepage: string;
  hometown: string;
  keywords: string[];
  gender: string;
  marital: string;
  sexual: string;
  politic: string;
  religion: string;
  dob: string;
  music: string;
  book: string;
  tv: string;
  film: string;
  interest: string;
  romance: string;
  work: string;
  education: string;
  likes: string;
  dislikes: string;
  contact: string;
  channels: string;
  connections: number;
  is_connected: boolean;
};

async function fetchProfile(nick: string): Promise<ChannelProfile | null> {
  if (!nick) return null;
  const res = await apiFetch(`/api/profile/${nick}`);
  if (!res.ok) return null;
  const { data } = await res.json();
  if (!data) return null;
  return data as ChannelProfile;
}

export default function ProfileView(props: { full?: boolean }) {
  const params = useParams<{ nick?: string }>();
  const viewerRole = useViewerRole();
  const [profile] = createResource(() => params.nick ?? "", fetchProfile);

  const isOwner = () => viewerRole() === "owner";
  const isVisitor = () => viewerRole() === "remote" || viewerRole() === "anonymous";
  const p = () => profile();

  return (
    <div class="mb-6">
      <Show when={profile.loading}>
        <ProfileSkeleton />
      </Show>
      <Show when={p() !== undefined && p() !== null}>
        <Show
          when={props.full}
          fallback={
            <CompactCard p={p()!} isOwner={isOwner()} isVisitor={isVisitor()} />
          }
        >
          <FullCard p={p()!} isOwner={isOwner()} isVisitor={isVisitor()} />
        </Show>
      </Show>
    </div>
  );
}

// ─── Shared header (cover + avatar + name + connect) ────────────────────────

function ProfileHeader(props: {
  p: ChannelProfile;
  isOwner: boolean;
  isVisitor: boolean;
}) {
  const { p } = props;
  const { t } = useI18n();

  return (
    <>
      {/* Cover */}
      <div class="relative bg-gradient-to-br from-accent to-accent-txt" style="aspect-ratio: 3 / 1;">
        <Show when={p.channel_cover}>
          <img src={p.channel_cover} alt="" class="absolute inset-0 w-full h-full object-cover" />
        </Show>
        <div class="absolute -bottom-10 left-5">
          <img
            src={p.channel_photo_l}
            alt={p.channel_name}
            class="w-20 h-20 rounded-full ring-4 ring-surface object-cover bg-overlay"
          />
        </div>
        <Show when={props.isOwner}>
          <a
            href="/settings/profile"
            class="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
          >
            {t("channel.edit_profile")}
          </a>
        </Show>
      </div>

      {/* Name row */}
      <div class="pt-12 px-5 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-lg font-bold leading-tight text-txt">{p.channel_name}</h1>
          <p class="text-sm text-muted">@{p.channel_address}</p>
          <Show when={p.pdesc}>
            <p class="text-xs text-muted mt-0.5 italic">{p.pdesc}</p>
          </Show>
        </div>
        <Show when={!props.isOwner}>
          <FollowButton nick={p.channel_address} connected={p.is_connected} isVisitor={props.isVisitor} />
        </Show>
      </div>
    </>
  );
}

// ─── Compact card (shown on /channel/:nick) ──────────────────────────────────

function CompactCard(props: { p: ChannelProfile; isOwner: boolean; isVisitor: boolean }) {
  const { p } = props;
  const { t } = useI18n();

  return (
    <div class="rounded-2xl overflow-hidden bg-surface border border-rim shadow-sm">
      <ProfileHeader p={p} isOwner={props.isOwner} isVisitor={props.isVisitor} />

      <div class="px-5 pb-5">
        {/* Location + gender */}
        <Show when={p.location || p.gender}>
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <Show when={p.location}>
              <span class="flex items-center gap-1">
                <MdFillLocation_on size={14} /> {p.location}
              </span>
            </Show>
            <Show when={p.gender}>
              <span>{p.gender}</span>
            </Show>
          </div>
        </Show>

        {/* Keywords */}
        <Show when={p.keywords.length > 0}>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <For each={p.keywords}>
              {(tag) => (
                <span class="px-2 py-0.5 text-xs rounded-full bg-overlay text-muted">#{tag}</span>
              )}
            </For>
          </div>
        </Show>

        {/* Contact info */}
        <Show when={p.homepage || p.contact}>
          <div class="mt-3 space-y-1">
            <Show when={p.homepage}>
              <a
                href={p.homepage}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors"
              >
                <MdFillPublic size={13} />
                {p.homepage.replace(/^https?:\/\//, "")}
              </a>
            </Show>
            <Show when={p.contact}>
              <p class="text-xs text-muted">{p.contact}</p>
            </Show>
          </div>
        </Show>

        {/* View full profile */}
        <div class="mt-3 flex justify-end">
          <A
            href={`/profile/${p.channel_address}`}
            class="text-xs text-muted hover:text-accent transition-colors"
          >
            {t("channel.more_details")} →
          </A>
        </div>
      </div>
    </div>
  );
}

// ─── Full card (shown on /profile/:nick) ─────────────────────────────────────

function FullCard(props: { p: ChannelProfile; isOwner: boolean; isVisitor: boolean }) {
  const { p } = props;
  const { t } = useI18n();

  return (
    <div class="rounded-2xl overflow-hidden bg-surface border border-rim shadow-sm">
      <ProfileHeader p={p} isOwner={props.isOwner} isVisitor={props.isVisitor} />

      <div class="px-5 pb-6 space-y-5 mt-4">
        {/* About */}
        <Show when={p.about}>
          <div
            class="text-sm text-txt leading-relaxed prose prose-sm dark:prose-invert max-w-none
                   prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
            innerHTML={p.about}
          />
        </Show>

        {/* Meta bar */}
        <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
          <Show when={p.location}>
            <span class="flex items-center gap-1">
              <MdFillLocation_on size={14} /> {p.location}
            </span>
          </Show>
          <Show when={p.homepage}>
            <a
              href={p.homepage}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 hover:text-accent transition-colors"
            >
              <MdFillPublic size={13} /> {p.homepage.replace(/^https?:\/\//, "")}
            </a>
          </Show>
        </div>

        {/* Keywords */}
        <Show when={p.keywords.length > 0}>
          <div class="flex flex-wrap gap-1.5">
            <For each={p.keywords}>
              {(tag) => (
                <span class="px-2 py-0.5 text-xs rounded-full bg-overlay text-muted">#{tag}</span>
              )}
            </For>
          </div>
        </Show>

        {/* Field sections */}
        <Show when={
          p.gender || p.marital || p.sexual || (p.dob && p.dob !== "0000-00-00") || p.hometown ||
          p.politic || p.religion || p.interest || p.romance || p.likes || p.dislikes ||
          p.music || p.book || p.tv || p.film || p.work || p.education || p.contact || p.channels
        }>
          <div class="border-t border-rim pt-5 space-y-5">
            <Show when={p.gender || p.marital || p.sexual || (p.dob && p.dob !== "0000-00-00") || p.hometown}>
              <FieldSection label={t("channel.group_personal")}>
                <Field label={t("channel.field_gender")}       value={p.gender} />
                <Field label={t("channel.field_born")}         value={p.dob && p.dob !== "0000-00-00" ? p.dob : ""} />
                <Field label={t("channel.field_hometown")}     value={p.hometown} />
                <Field label={t("channel.field_relationship")} value={p.marital} />
                <Field label={t("channel.field_sexual")}       value={p.sexual} />
              </FieldSection>
            </Show>

            <Show when={p.politic || p.religion}>
              <FieldSection label={t("channel.group_beliefs")}>
                <Field label={t("channel.field_politics")}  value={p.politic} />
                <Field label={t("channel.field_religion")}  value={p.religion} />
              </FieldSection>
            </Show>

            <Show when={p.interest || p.romance || p.likes || p.dislikes}>
              <FieldSection label={t("channel.group_interests")}>
                <Field label={t("channel.field_hobbies")}   value={p.interest} />
                <Field label={t("channel.field_romance")}   value={p.romance} />
                <Field label={t("channel.field_likes")}     value={p.likes} />
                <Field label={t("channel.field_dislikes")}  value={p.dislikes} />
              </FieldSection>
            </Show>

            <Show when={p.music || p.book || p.tv || p.film}>
              <FieldSection label={t("channel.group_culture")}>
                <Field label={t("channel.field_music")}      value={p.music} />
                <Field label={t("channel.field_books")}      value={p.book} />
                <Field label={t("channel.field_television")} value={p.tv} />
                <Field label={t("channel.field_film")}       value={p.film} />
              </FieldSection>
            </Show>

            <Show when={p.work || p.education}>
              <FieldSection label={t("channel.group_work")}>
                <Field label={t("channel.field_work")}      value={p.work} />
                <Field label={t("channel.field_education")} value={p.education} />
              </FieldSection>
            </Show>

            <Show when={p.contact || p.channels}>
              <FieldSection label={t("channel.group_contact")}>
                <Field label={t("channel.field_contact")}        value={p.contact} />
                <Field label={t("channel.field_other_channels")} value={p.channels} />
              </FieldSection>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FieldSection(props: { label: string; children: any }) {
  return (
    <div>
      <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2.5">
        {props.label}
      </p>
      <div class="grid grid-cols-1 gap-2">
        {props.children}
      </div>
    </div>
  );
}

function Field(props: { label: string; value: string }) {
  return (
    <Show when={props.value}>
      <div class="flex gap-3">
        <span class="text-xs font-medium text-muted w-28 shrink-0 pt-px">{props.label}</span>
        <span class="text-xs text-txt leading-relaxed">{props.value}</span>
      </div>
    </Show>
  );
}

function FollowButton(props: { nick: string; connected: boolean; isVisitor: boolean }) {
  const { t } = useI18n();
  const href = () =>
    props.isVisitor
      ? `/follow?url=${encodeURIComponent(props.nick)}`
      : `/connedit?add=${encodeURIComponent(props.nick)}`;

  const cls = props.connected
    ? "border-rim text-muted hover:border-accent hover:text-accent"
    : "border-accent bg-accent text-accent-fg hover:opacity-80";

  return (
    <a href={href()} class={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${cls}`}>
      {props.connected ? t("channel.connected") : t("channel.connect")}
    </a>
  );
}

function ProfileSkeleton() {
  return (
    <div class="rounded-2xl overflow-hidden bg-surface border border-rim shadow-sm animate-pulse">
      <div class="h-36 bg-overlay" />
      <div class="pt-12 px-5 pb-5">
        <div class="flex items-start justify-between">
          <div class="space-y-2">
            <div class="h-5 w-36 bg-overlay rounded" />
            <div class="h-3.5 w-24 bg-overlay rounded" />
          </div>
          <div class="h-8 w-24 bg-overlay rounded-full" />
        </div>
        <div class="mt-3 space-y-2">
          <div class="h-3 bg-overlay rounded w-full" />
          <div class="h-3 bg-overlay rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}
