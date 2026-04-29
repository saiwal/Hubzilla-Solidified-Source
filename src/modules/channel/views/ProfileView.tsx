// src/modules/channel/views/ProfileView.tsx
import { createResource, Show, For, createSignal } from "solid-js";
import { useParams } from "@solidjs/router";
import { useViewerRole } from "@/shared/store/site-config";
import { MdFillPublic, MdFillLocation_on, MdFillExpand_more, MdFillExpand_less } from "solid-icons/md";
import { apiFetch } from "@/shared/lib/fetch";

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
export default function ProfileView() {
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
        <ProfileCard p={p()!} isOwner={isOwner()} isVisitor={isVisitor()} />
      </Show>
    </div>
  );
}

function ProfileField(props: { label: string; value: string }) {
  return (
    <Show when={props.value}>
      <div class="flex gap-2">
        <span class="text-xs font-medium text-muted w-28 shrink-0 pt-0.5">
          {props.label}
        </span>
        <span class="text-txt text-xs leading-relaxed">
          {props.value}
        </span>
      </div>
    </Show>
  );
}

function ProfileCard(props: {
  p: ChannelProfile;
  isOwner: boolean;
  isVisitor: boolean;
}) {
  const { p } = props;
  const [expanded, setExpanded] = createSignal(false);

  const hasDetails = () =>
    p.gender || p.marital || p.sexual || p.dob !== "0000-00-00" ||
    p.politic || p.religion || p.hometown || p.interest || p.romance ||
    p.work || p.education || p.music || p.book || p.tv || p.film ||
    p.likes || p.dislikes || p.contact || p.channels;

  return (
    <div class="rounded-2xl overflow-hidden bg-surface border border-rim shadow-sm">
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
            href="/settings/channel"
            class="absolute top-3 right-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-colors"
          >
            Edit profile
          </a>
        </Show>
      </div>

      {/* Body */}
      <div class="pt-12 px-5 pb-5">
        {/* Name + follow */}
        <div class="flex items-start justify-between gap-3">
          <div>
            <h1 class="text-lg font-bold leading-tight text-txt">
              {p.channel_name}
            </h1>
            <p class="text-sm text-muted">@{p.channel_address}</p>
            <Show when={p.pdesc}>
              <p class="text-xs text-muted mt-0.5 italic">{p.pdesc}</p>
            </Show>
          </div>
          <Show when={!props.isOwner}>
            <FollowButton nick={p.channel_address} connected={p.is_connected} isVisitor={props.isVisitor} />
          </Show>
        </div>

        {/* About */}
        <Show when={p.about}>
          <div
            class="mt-3 text-sm text-txt leading-relaxed prose prose-sm dark:prose-invert max-w-none
                     prose-a:text-accent prose-a:no-underline hover:prose-a:underline"
            innerHTML={p.about}
          />
        </Show>

        {/* Basic meta */}
        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
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
          <Show when={p.connections > 0}>
            <span>
              <strong class="text-txt">{p.connections}</strong> connections
            </span>
          </Show>
        </div>

        {/* Keywords */}
        <Show when={p.keywords.length > 0}>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <For each={p.keywords}>
              {(tag) => (
                <span class="px-2 py-0.5 text-xs rounded-full bg-overlay text-muted">
                  #{tag}
                </span>
              )}
            </For>
          </div>
        </Show>

        {/* Expanded details */}
        <Show when={expanded()}>
          <div class="mt-4 pt-4 border-t border-rim space-y-4">
            {/* Personal */}
            <Show when={p.gender || p.marital || p.sexual || (p.dob && p.dob !== "0000-00-00") || p.hometown}>
              <FieldGroup label="Personal">
                <ProfileField label="Gender" value={p.gender} />
                <ProfileField label="Born" value={p.dob && p.dob !== "0000-00-00" ? p.dob : ""} />
                <ProfileField label="Hometown" value={p.hometown} />
                <ProfileField label="Relationship" value={p.marital} />
                <ProfileField label="Sexual preference" value={p.sexual} />
              </FieldGroup>
            </Show>

            {/* Beliefs */}
            <Show when={p.politic || p.religion}>
              <FieldGroup label="Beliefs">
                <ProfileField label="Politics" value={p.politic} />
                <ProfileField label="Religion" value={p.religion} />
              </FieldGroup>
            </Show>

            {/* Interests */}
            <Show when={p.interest || p.romance || p.likes || p.dislikes}>
              <FieldGroup label="Interests">
                <ProfileField label="Hobbies" value={p.interest} />
                <ProfileField label="Romance" value={p.romance} />
                <ProfileField label="Likes" value={p.likes} />
                <ProfileField label="Dislikes" value={p.dislikes} />
              </FieldGroup>
            </Show>

            {/* Culture */}
            <Show when={p.music || p.book || p.tv || p.film}>
              <FieldGroup label="Culture">
                <ProfileField label="Music" value={p.music} />
                <ProfileField label="Books" value={p.book} />
                <ProfileField label="Television" value={p.tv} />
                <ProfileField label="Film" value={p.film} />
              </FieldGroup>
            </Show>

            {/* Work & Education */}
            <Show when={p.work || p.education}>
              <FieldGroup label="Work & Education">
                <ProfileField label="Work" value={p.work} />
                <ProfileField label="Education" value={p.education} />
              </FieldGroup>
            </Show>

            {/* Contact & Social */}
            <Show when={p.contact || p.channels}>
              <FieldGroup label="Contact & Social">
                <ProfileField label="Contact" value={p.contact} />
                <ProfileField label="Other channels" value={p.channels} />
              </FieldGroup>
            </Show>
          </div>
        </Show>

        {/* Expand toggle */}
        <Show when={hasDetails()}>
          <button
            onClick={() => setExpanded((e) => !e)}
            class="mt-4 w-full flex items-center justify-center gap-1 text-xs text-muted hover:text-accent transition-colors py-1"
          >
            <Show when={!expanded()} fallback={<><MdFillExpand_less size={16} /> Show less</>}>
              <MdFillExpand_more size={16} /> More details
            </Show>
          </button>
        </Show>
      </div>
    </div>
  );
}

function FieldGroup(props: { label: string; children: any }) {
  return (
    <div>
      <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {props.label}
      </p>
      <div class="grid grid-cols-1 gap-1.5">
        {props.children}
      </div>
    </div>
  );
}

function FollowButton(props: { nick: string; connected: boolean; isVisitor: boolean }) {
  const href = () =>
    props.isVisitor
      ? `/follow?url=${encodeURIComponent(props.nick)}`
      : `/connedit?add=${encodeURIComponent(props.nick)}`;

  const cls = props.connected
    ? "border-rim text-muted hover:border-accent hover:text-accent"
    : "border-accent bg-accent text-white hover:opacity-80";

  return (
    <a href={href()} class={`shrink-0 px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${cls}`}>
      {props.connected ? "Connected" : "Connect"}
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
