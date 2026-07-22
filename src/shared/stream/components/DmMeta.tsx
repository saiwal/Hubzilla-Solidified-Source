import { Show } from "solid-js";
import { BiRegularEnvelope } from "solid-icons/bi";
import { useI18n } from "@/i18n";
import type { Post } from "@/shared/types/post.types";

export function isDirectMessage(post: Pick<Post, "flags">): boolean {
  return post.flags.includes("direct_message");
}

// Card/row-root accent for a DM — a distinct left border + subtle tint so it
// reads as a letter, not a social post. Takes priority over the flat-reply
// accent (same border-l-2 slot) wherever both could apply — a DM is a
// stronger, rarer signal than "this happens to be an unthreaded reply".
export const DM_ACCENT_CLASS = " border-l-2 border-l-violet-500/60 bg-violet-500/[0.04]";

export function DmBadge(props: { size?: "sm" | "md" }) {
  const { t } = useI18n();
  const iconSize = () => (props.size === "md" ? 11 : 10);
  return (
    <span
      class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
             bg-violet-500/15 text-violet-600 dark:text-violet-400 leading-none"
      title={t("post.dm_title")}
    >
      <BiRegularEnvelope size={iconSize()} />
      <span>{t("post.dm_badge")}</span>
    </span>
  );
}

export function DmRecipients(props: { recipients?: string; class?: string }) {
  const { t } = useI18n();
  return (
    <Show when={props.recipients}>
      <div class={props.class ?? "text-xs text-muted truncate"}>
        {t("post.dm_to")}: {props.recipients}
      </div>
    </Show>
  );
}
