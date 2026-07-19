import { useI18n } from "@/i18n";
import { createSignal, Show, lazy } from "solid-js";
import { MessageFeed } from "./MessageFeed";

const HqFoldersWidget = lazy(() => import("./HqFoldersWidget"));

type Tab = "all" | "folders";

// The dashboard's main message card. "All" is the live feed; "Folders"
// combines file-tag folders with a pinned "Starred" entry (see
// HqFoldersWidget.tsx). Direct messages and notices stay separate, opt-in
// widgets (HqDirectMessagesWidget.tsx / HqNoticesWidget.tsx).
export default function HqMessagesWidget() {
  const { t } = useI18n();
  const [tab, setTab] = createSignal<Tab>("all");

  return (
    <div
      class="bg-surface rounded-2xl border border-rim flex flex-col overflow-hidden shadow-sm"
      style={{ height: "480px" }}
    >
      <div class="px-2.5 pt-2.5 shrink-0 flex items-center gap-1 border-b border-rim">
        <button
          type="button"
          onClick={() => setTab("all")}
          class="px-2.5 py-1.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px"
          classList={{
            "text-txt border-accent": tab() === "all",
            "text-muted border-transparent hover:text-txt": tab() !== "all",
          }}
        >
          {t("hq.msg_tab_all")}
        </button>
        <button
          type="button"
          onClick={() => setTab("folders")}
          class="px-2.5 py-1.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px"
          classList={{
            "text-txt border-accent": tab() === "folders",
            "text-muted border-transparent hover:text-txt": tab() !== "folders",
          }}
        >
          {t("hq.msg_tab_folders")}
        </button>
      </div>

      <Show when={tab() === "all"}>
        <MessageFeed type="" bare />
      </Show>
      <Show when={tab() === "folders"}>
        <HqFoldersWidget />
      </Show>
    </div>
  );
}
