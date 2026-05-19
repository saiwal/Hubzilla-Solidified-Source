// src/shared/views/PostDetailModal.tsx
import { type Component, createResource, Show } from "solid-js";
import { Portal } from "solid-js/web";
import PostCard from "../stream/components/PostCard";
import type { StreamHandlers } from "../stream/types";
import { bbcodeToHtml } from "../lib/bbcode";
import { sanitizeHtml } from "../lib/sanitize";
import type { ThreadNode } from "../lib/thread";
import { buildThreadTree } from "../lib/thread";
import type { Post } from "../types/post.types";
import { BiRegularX } from "solid-icons/bi";

interface DisplayResponse {
  post: RawItem;
  comments: RawItem[];
}

interface RawItem {
  uuid: string;
  mid: string;
  parent_mid: string;
  thr_parent: string;
  message_top: string;
  created: string;
  edited?: string;
  commented?: string;
  title: string;
  body: string;
  verb?: string;
  obj_type?: string;
  like_count: number;
  dislike_count: number;
  announce_count: number;
  comment_count: number;
  item_private: number;
  item_thread_top: number;
  iid: number;
  profile_uid: number;
  flags: string[];
  author: {
    name: string;
    address: string;
    url: string;
    photo: { src: string; mimetype: string };
  };
  permalink: string;
  viewer_liked: boolean;
  viewer_disliked: boolean;
  viewer_repeated: boolean;
}

function rawToPost(r: RawItem): Post {
  return {
    uuid: r.uuid,
    id: r.uuid,
    iid: r.iid,
    profileUid: r.profile_uid,
    mid: r.mid,
    parent_mid: r.parent_mid,
    thr_parent: r.thr_parent,
    top_mid: r.message_top,
    parent: r.parent_mid,
    body: sanitizeHtml(bbcodeToHtml(r.body)),
    title: r.title,
    authorName: r.author.name,
    authorAvatar: r.author.photo.src,
    authorUrl: r.author.url,
    created: r.created,
    commented: r.commented,
    edited: r.edited,
    verb: r.verb,
    obj_type: r.obj_type,
    item_thread_top: r.item_thread_top,
    flags: r.flags,
    permalink: r.permalink,
    children: [],
    likeCount: r.like_count,
    dislikeCount: r.dislike_count,
    repeatCount: r.announce_count,
    viewerLiked: r.viewer_liked,
    viewerDisliked: r.viewer_disliked,
    viewerRepeated: r.viewer_repeated,
  };
}

async function fetchDisplay(uuid: string): Promise<ThreadNode> {
  const res = await fetch(`/api/display/${uuid}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // unwrap envelope if present
  const data: DisplayResponse = json.data ?? json;
  if ((data as any).error) throw new Error((data as any).error);
  const all: Post[] = [data.post, ...data.comments].map(rawToPost);
  const tree = buildThreadTree(all);
  return tree[0];
}
interface PostDetailModalProps {
  uuid: string;
  onClose: () => void;
  handlers?: StreamHandlers;
}

const PostDetailModal: Component<PostDetailModalProps> = (props) => {
  const [node, { refetch }] = createResource(() => props.uuid, fetchDisplay);

  // Wrap handlers to trigger a refetch after each mutation so counts update
  const wrappedHandlers: StreamHandlers | undefined = props.handlers
    ? {
        onLike: (mid: string) => {
          props.handlers!.onLike(mid);
          refetch();
        },
        onDislike: (mid: string) => {
          props.handlers!.onDislike(mid);
          refetch();
        },
        onRepeat: (mid: string) => {
          props.handlers!.onRepeat(mid);
          refetch();
        },
        onComment: (
          parentMid: string,
          body: string,
          authorName: string,
          authorAvatar: string,
        ) => {
          props.handlers!.onComment(parentMid, body, authorName, authorAvatar);
          refetch();
        },
        onLoadComments: (mid: string, uuid: string) =>
          props.handlers!.onLoadComments(mid, uuid),
      }
    : undefined;

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        <div
          class="relative w-full max-w-full lg:max-w-[50%] max-h-[90svh] flex flex-col
                 bg-base rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div class="flex items-center justify-between px-5 py-3 shrink-0 border-b border-rim bg-surface">
            <h2 class="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Post
            </h2>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg hover:bg-elevated
                     text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <BiRegularX />
            </button>
          </div>

          {/* Scrollable body */}
          <div class="flex-1 overflow-y-auto p-4" style={{ "-webkit-overflow-scrolling": "touch" }} onClick={(e) => e.stopPropagation()}>
            <Show when={node.loading}>
              <div class="space-y-4 animate-pulse">
                <div class="bg-surface rounded-2xl p-5">
                  <div class="flex gap-3 mb-4">
                    <div class="w-11 h-11 rounded-full bg-elevated" />
                    <div class="flex-1 space-y-2 pt-1">
                      <div class="h-3 bg-elevated rounded w-1/3" />
                      <div class="h-3 bg-elevated rounded w-1/4" />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="h-3 bg-elevated rounded" />
                    <div class="h-3 bg-elevated rounded w-5/6" />
                    <div class="h-3 bg-elevated rounded w-4/6" />
                  </div>
                </div>
              </div>
            </Show>

            <Show when={node.error}>
              <div class="bg-surface rounded-2xl p-6 text-center">
                <p class="text-sm text-red-500">
                  Failed to load post: {node.error?.message}
                </p>
              </div>
            </Show>

            <Show when={node()}>
              {(n) => (
                <PostCard
                  post={n()}
                  handlers={
                    wrappedHandlers ?? {
                      onLike: () => {},
                      onDislike: () => {},
                      onRepeat: () => {},
                      onComment: () => {},
                      onLoadComments: () => Promise.resolve(),
                    }
                  }
                />
              )}
            </Show>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PostDetailModal;
