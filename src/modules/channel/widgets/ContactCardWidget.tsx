// Compact vCard-style summary of the current page's channel, reusing the
// existing GET /api/profile/:nick endpoint (same data ChannelView's profile
// header uses) — no widget-specific backend needed.

import { Show, For } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { apiFetch } from "@/shared/lib/fetch";
import { usePageNick, useViewerRole } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";

interface ProfileData {
  channel_name: string;
  channel_address: string;
  xchan_addr: string;
  channel_photo_l: string;
  location: string;
  homepage: string;
  keywords: string[];
  is_connected: boolean;
  connect_url: string;
}

async function fetchProfile(nick: string): Promise<ProfileData | null> {
  if (!nick) return null;
  const res = await apiFetch(`/api/profile/${nick}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data as ProfileData;
}

export default function ContactCardWidget() {
  const nick = usePageNick();
  const viewerRole = useViewerRole();
  const { t } = useI18n();

  const [data] = createQueryResource("contact-card", () => nick(), fetchProfile);

  const profile = () => data();

  return (
    <Show when={!data.loading && profile()}>
      <div class="bg-surface border border-rim rounded-xl p-4">
        <div class="flex items-center gap-3">
          <img
            src={profile()!.channel_photo_l}
            alt={profile()!.channel_name}
            class="w-14 h-14 rounded-full object-cover ring-1 ring-rim shrink-0"
          />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-txt truncate">{profile()!.channel_name}</p>
            <p class="text-xs text-muted truncate">{profile()!.xchan_addr || profile()!.channel_address}</p>
          </div>
        </div>

        <Show when={profile()!.location}>
          <p class="text-xs text-muted mt-3">{profile()!.location}</p>
        </Show>

        <Show when={profile()!.homepage}>
          <a
            href={profile()!.homepage}
            target="_blank"
            rel="noopener noreferrer"
            class="block text-xs text-accent hover:underline mt-1 truncate"
          >
            {profile()!.homepage}
          </a>
        </Show>

        <Show when={profile()!.keywords.length > 0}>
          <div class="flex flex-wrap gap-1 mt-3">
            <For each={profile()!.keywords.slice(0, 8)}>
              {(kw) => (
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-elevated text-muted">
                  {kw}
                </span>
              )}
            </For>
          </div>
        </Show>

        <Show when={viewerRole() !== "owner" && viewerRole() !== "anonymous"}>
          <div class="mt-3 pt-3 border-t border-rim flex gap-2">
            <a href={`/channel/${profile()!.channel_address}`} class="text-xs text-accent hover:underline">
              {t("ui.view_channel")}
            </a>
            <Show when={!profile()!.is_connected && profile()!.connect_url}>
              <a
                href={profile()!.connect_url}
                class="text-xs text-accent hover:underline"
              >
                {t("ui.connect")}
              </a>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  );
}
