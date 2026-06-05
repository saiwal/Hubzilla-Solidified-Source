// src/shared/stream/components/CommentBox.tsx
import { createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import { useI18n } from "@/i18n";

export default function CommentBox(props: {
  post: ThreadNode;
  handlers: StreamHandlers;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [body, setBody] = createSignal("");

  const submit = () => {
    const text = body().trim();
    if (!text) return;
    props.handlers.onComment(
      props.post.mid,
      text,
      props.post.authorName,
      props.post.authorAvatar,
    );
    setBody("");
    props.onClose();
  };

  return (
    <div class="mt-3 flex gap-2">
      <textarea
        value={body()}
        onInput={(e) => setBody(e.currentTarget.value)}
        rows={2}
        placeholder={t("ui.write_reply")}
        class="flex-1 text-sm rounded-lg border border-rim
               bg-surface px-3 py-2 resize-none text-txt
               focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <div class="flex flex-col gap-1">
        <button
          onClick={submit}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-accent text-accent-fg hover:opacity-80 transition-opacity"
        >
          {t("ui.reply_btn")}
        </button>
        <button
          onClick={props.onClose}
          class="px-3 py-1 text-xs rounded-lg text-muted hover:bg-overlay transition-colors"
        >
          {t("ui.cancel_btn")}
        </button>
      </div>
    </div>
  );
}
