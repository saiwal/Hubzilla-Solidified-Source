// src/shared/views/HelpTrigger.tsx
import { useHelpMode } from "@/shared/store/help-mode";
import { MdFillLive_help } from "solid-icons/md";
import { useI18n } from "@/i18n";

export default function HelpTrigger() {
  const { t } = useI18n();
  const { helpMode, enter, exit } = useHelpMode();
  return (
    <button
      onClick={() => helpMode() ? exit() : enter()}
      class={`px-3 py-2 rounded-lg  hover:opacity-80 text-sm transition-colors
        ${helpMode()
          ? "bg-accent-muted text-accent"
          : "text-muted hover:bg-elevated"
        }`}
      title={t("ui.help_mode")}
    >
    <MdFillLive_help size={17}/>
    </button>
  );
}
