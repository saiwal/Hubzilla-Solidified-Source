// mappers/activity.mapper.ts
import { sanitizeHtml } from "@/shared/lib/sanitize";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import { oembedResolver } from "@/shared/lib/oembedResolver";
import type { Post, EventData } from "@/shared/types/post.types";

export function parseEventData(raw: string): EventData | undefined {
  const get = (tag: string) => {
    const m = raw.match(new RegExp(`\\[${tag}\\]([^\\[]*?)\\[\\/${tag}\\]`));
    return m ? m[1].trim() : "";
  };
  const summary = get("event-summary");
  const start   = get("event-start");
  if (!summary || !start) return undefined;
  return { summary, start, finish: get("event-finish"), id: get("event-id") };
}

// Verbs that represent actual displayable content
// const DISPLAYABLE_VERBS = new Set(['Create', 'Like', 'Dislike', 'Announce']);

export function shouldDisplayActivity(activity: any): boolean {
  // Filter out internal "Add" bookkeeping entries — they have no body and just mirror another item
  if (activity.verb === "Add") return false;
  // Filter out items flagged as notshown
  if (activity.flags?.includes("notshown")) return false;
  return true;
}

export function mapActivityToPost(activity: any): Post {
  const rawBody: string = activity.body ?? "";
  let body = "";

  try {
    const converted = bbcodeToHtml(rawBody, { oembedResolver });
    body = sanitizeHtml(typeof converted === "string" ? converted : "");
  } catch (err) {
    console.error("Body parse failed", rawBody, err);
    body = "";
  }

  const eventData = activity.obj_type === "Event" ? parseEventData(rawBody) : undefined;

  // summary: returned by Articles handler as 'summary', fallback to activity stream fields
  const rawSummary: string =
    activity.summary ?? activity.item_summary ?? activity.obj_summary ?? "";
  const summary = rawSummary.trim() || undefined;

  return {
    id: activity.iid,
    iid: activity.iid ? Number(activity.iid) : undefined,
    uuid: activity.uuid,
    profileUid: activity.profile_uid ? Number(activity.profile_uid) : undefined,
    mid: activity.mid,
    parent_mid: activity.parent_mid,
    thr_parent: activity.thr_parent,
    top_mid: activity.message_top,
    parent: activity.uuid,
    body,
    summary,
    title: activity.title ?? "",
    authorName: activity.author?.name ?? "",
    authorAvatar: activity.author?.photo?.src ?? "",
    authorUrl: activity.author?.url ?? "",
    authorAddress: activity.author?.address ?? "",
    authorNetwork: activity.author?.network ?? "",
    via: activity.owner ? {
      name: activity.owner.name ?? "",
      address: activity.owner.address ?? "",
      url: activity.owner.url ?? "",
      avatar: activity.owner.photo?.src ?? "",
    } : undefined,
    created: activity.created,
    commented: activity.commented,
    edited: activity.edited,
    verb: activity.verb,
    obj_type: activity.obj_type,
    item_thread_top: activity.item_thread_top ?? 0,
    flags: activity.flags ?? [],
    permalink: activity.permalink ?? "",
    likeCount: activity.like_count ?? 0,
    viewerLiked: activity.viewer_liked ?? false,
    viewerDisliked: activity.viewer_disliked ?? false,
    viewerRepeated: activity.viewer_repeated ?? false,
    viewerStarred: (activity.flags ?? []).includes('starred'),
    viewerFollowing: activity.viewer_following ?? false,
    viewerAttending: activity.viewer_attending ?? false,
    viewerDeclining: activity.viewer_declining ?? false,
    viewerMaybe: activity.viewer_maybe ?? false,
    attendCount: activity.attend_count ?? 0,
    declineCount: activity.decline_count ?? 0,
    maybeCount: activity.maybe_count ?? 0,
    item_origin: activity.item_origin ?? 0,
    dislikeCount: activity.dislike_count ?? 0,
    repeatCount: activity.announce_count ?? 0,
    commentCount: activity.comment_count ?? 0,
    eventData,
    attachments: Array.isArray(activity.attach)
      ? activity.attach.map((a: any) => ({
          href: a.href ?? "",
          type: a.type ?? "application/octet-stream",
          title: a.title ?? (a.href ? decodeURIComponent(a.href.split("/").pop() ?? "") : ""),
          length: a.length != null ? String(a.length) : "0",
          revision: a.revision != null ? String(a.revision) : "0",
        }))
      : [],
    categories: activity.categories ?? [],
    tags: activity.tags ?? [],
    children: [],
  };
}
