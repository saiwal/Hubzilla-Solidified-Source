import { For } from "solid-js";

type Notif = {
  id: number;
  authorName: string;
  initials: string;
  verb: string;
  ago: string;
  unread: boolean;
  color: string;
};

const DUMMY: Notif[] = [
  { id: 1, authorName: "Alice K.", initials: "AK", verb: "liked your post", ago: "2m ago", unread: true, color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" },
  { id: 2, authorName: "Bob M.", initials: "BM", verb: "commented on your photo", ago: "14m ago", unread: true, color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" },
  { id: 3, authorName: "Carol R.", initials: "CR", verb: "connected with you", ago: "1h ago", unread: false, color: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300" },
  { id: 4, authorName: "Dave S.", initials: "DS", verb: "repeated your post", ago: "3h ago", unread: false, color: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300" },
  { id: 5, authorName: "Eve T.", initials: "ET", verb: "liked your comment", ago: "5h ago", unread: false, color: "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300" },
];

export default function NotificationsAside() {
  const unread = DUMMY.filter((n) => n.unread).length;

  return (
    <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Notifications</p>
        {unread > 0 && (
          <span class="text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
            {unread} new
          </span>
        )}
      </div>
      <For each={DUMMY}>
        {(n) => (
          <div class="flex gap-2 items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            {/* unread dot */}
            <div class={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${n.unread ? "bg-blue-500" : "bg-transparent"}`} />
            <div class={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${n.color}`}>
              {n.initials}
            </div>
            <div class="min-w-0">
              <p class="text-xs text-gray-600 dark:text-gray-300 leading-snug">
                <span class="font-medium text-gray-900 dark:text-gray-100">{n.authorName}</span>{" "}
                {n.verb}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">{n.ago}</p>
            </div>
          </div>
        )}
      </For>
      <button class="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-center">
        View all
      </button>
    </div>
  );
}
