// src/shared/ui/PostDetailModal.tsx
import { type Component, createResource, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import PostCard, { type PostActions } from './PostCard';
import type { ThreadNode } from '../lib/thread';
import { buildThreadTree } from '../lib/thread';
import type { Post } from '../types/post.types';

interface DisplayResponse {
  post:     RawItem;
  comments: RawItem[];
}

interface RawItem {
  uuid:            string;
  mid:             string;
  parent_mid:      string;
  thr_parent:      string;
  message_top:     string;
  created:         string;
  edited?:         string;
  commented?:      string;
  title:           string;
  body:            string;
  verb?:           string;
  obj_type?:       string;
  like_count:      number;
  dislike_count:   number;
  announce_count:  number;
  comment_count:   number;
  item_private:    number;
  item_thread_top: number;
  iid:             number;
  profile_uid:     number;
  flags:           string[];
  author: {
    name:    string;
    address: string;
    url:     string;
    photo:   { src: string; mimetype: string };
  };
  permalink:       string;
  viewer_liked:    boolean;
  viewer_disliked: boolean;
  viewer_repeated: boolean;
}

function rawToPost(r: RawItem): Post {
  return {
    uuid:            r.uuid,
    id:              r.uuid,
    iid:             r.iid,
    profileUid:      r.profile_uid,
    mid:             r.mid,
    parent_mid:      r.parent_mid,
    thr_parent:      r.thr_parent,
    top_mid:         r.message_top,
    parent:          r.parent_mid,
    body:            r.body,
    title:           r.title,
    authorName:      r.author.name,
    authorAvatar:    r.author.photo.src,
    authorUrl:       r.author.url,
    created:         r.created,
    commented:       r.commented,
    edited:          r.edited,
    verb:            r.verb,
    obj_type:        r.obj_type,
    item_thread_top: r.item_thread_top,
    flags:           r.flags,
    permalink:       r.permalink,
    children:        [],
    likeCount:       r.like_count,
    dislikeCount:    r.dislike_count,
    repeatCount:     r.announce_count,
    viewerLiked:     r.viewer_liked,
    viewerDisliked:  r.viewer_disliked,
    viewerRepeated:  r.viewer_repeated,
  };
}

async function fetchDisplay(uuid: string): Promise<ThreadNode> {
  const res = await fetch(`/display/${uuid}?format=json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: DisplayResponse = await res.json();
  if ((data as any).error) throw new Error((data as any).error);

  // Build a flat list of all posts then let buildThreadTree assemble the tree
  const all: Post[] = [data.post, ...data.comments].map(rawToPost);
  const tree = buildThreadTree(all);
  // tree[0] is the root with comments nested as children
  return tree[0];
}

interface PostDetailModalProps {
  uuid:    string;
  onClose: () => void;
  actions?: PostActions;
}

const PostDetailModal: Component<PostDetailModalProps> = (props) => {
  const [node, { refetch }] = createResource(() => props.uuid, fetchDisplay);

  // Wrap provided/default actions to refetch after mutations so counts update
  const wrappedActions: PostActions | undefined = props.actions
    ? {
        onLike:    async (...a) => { await props.actions!.onLike(...a);    refetch(); },
        onDislike: async (...a) => { await props.actions!.onDislike(...a); refetch(); },
        onRepeat:  async (...a) => { await props.actions!.onRepeat(...a);  refetch(); },
        onComment: async (...a) => { await props.actions!.onComment(...a); refetch(); },
      }
    : undefined;

  return (
    <Portal>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
<div class="relative w-full max-w-full lg:max-w-[50%] max-h-[90vh] flex flex-col
            bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div class="flex items-center justify-between px-5 py-3 shrink-0
                      border-b border-gray-200 dark:border-gray-700
                      bg-white dark:bg-gray-800">
            <h2 class="text-sm font-semibold text-gray-600 dark:text-gray-400">Post</h2>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                     text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div class="flex-1 overflow-y-auto p-4">

            <Show when={node.loading}>
              <div class="space-y-4 animate-pulse">
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-5">
                  <div class="flex gap-3 mb-4">
                    <div class="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div class="flex-1 space-y-2 pt-1">
                      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
                  </div>
                </div>
              </div>
            </Show>

            <Show when={node.error}>
              <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center">
                <p class="text-sm text-red-500">
                  Failed to load post: {node.error?.message}
                </p>
              </div>
            </Show>

            <Show when={node()}>
              {(n) => <PostCard post={n()} actions={wrappedActions} />}
            </Show>

          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PostDetailModal;
