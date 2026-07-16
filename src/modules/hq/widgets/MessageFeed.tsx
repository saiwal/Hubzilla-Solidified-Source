import { useI18n } from "@/i18n";
import { createSignal, type Component } from "solid-js";
import { FEED_META, MessageList, type MessageType } from "./MessageList";

// Card chrome (title + author-filter search) around the shared MessageList.
// Each concrete hq.messages.* widget is a thin wrapper that fixes `type`;
// see HqMessagesWidget.tsx, HqDirectMessagesWidget.tsx,
// HqStarredMessagesWidget.tsx and HqNoticesWidget.tsx.
export const MessageFeed: Component<{ type: MessageType }> = (props) => {
  const { t } = useI18n();
  const [authorFilter, setAuthorFilter] = createSignal("");

  let filterTimer: ReturnType<typeof setTimeout>;
  function onFilterInput(val: string) {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => setAuthorFilter(val), 300);
  }

  return (
    <div
      class="bg-surface rounded-2xl border border-rim flex flex-col overflow-hidden shadow-sm"
      style={{ height: "480px" }}
    >
      {/* ── Header ── */}
      <div class="px-3.5 pt-3.5 pb-2 shrink-0">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium uppercase tracking-wider text-muted">
            {t(FEED_META[props.type].titleKey as "hq.msg_tab_all")}
          </span>
          <div class="relative">
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={t("hq.filter_placeholder")}
              class="w-32 text-xs bg-overlay border-0 rounded-lg
                     pl-7 pr-3 py-1 text-txt placeholder-muted
                     focus:outline-none focus:ring-2 focus:ring-accent/40
                     transition-all duration-200 focus:w-40"
              onInput={(e) => onFilterInput(e.currentTarget.value)}
            />
          </div>
        </div>
      </div>

      <MessageList type={props.type} authorFilter={authorFilter()} />
    </div>
  );
};
