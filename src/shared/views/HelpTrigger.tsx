// src/shared/views/HelpTrigger.tsx
import { useHelpMode } from "@/shared/store/help-mode";

export default function HelpTrigger() {
  const { helpMode, enter, exit } = useHelpMode();
  return (
    <button
      onClick={() => helpMode() ? exit() : enter()}
      class={`p-2 rounded-lg text-sm transition-colors
        ${helpMode()
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
      title="Help mode"
    >
      ?
    </button>
  );
}
