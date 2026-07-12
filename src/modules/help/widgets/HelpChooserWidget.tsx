// src/modules/help/widgets/HelpChooserWidget.tsx
import { useLocation, A } from "@solidjs/router";
import { useI18n } from "@/i18n";

export default function HelpChooserWidget() {
  const { t } = useI18n();
  const location = useLocation();
  const section = () => location.pathname.split("/").filter(Boolean)[1] || "user";

  const sections = [
    { id: "user", label: () => t("help.section_user") },
    { id: "admin", label: () => t("help.section_admin") },
    { id: "dev", label: () => t("help.section_dev") },
  ] as const;

  return (
    <div class="bg-surface border border-rim rounded-2xl shadow-sm p-3">
      <div class="flex gap-1 p-1 bg-elevated rounded-lg w-fit">
        {sections.map((s) => (
          <A
            href={`/help/${s.id}`}
            class={`px-3 text-center text-xs py-1 rounded-md transition-colors font-medium
              ${
                section() === s.id
                  ? "bg-accent text-accent-fg font-semibold"
                  : "text-muted hover:text-txt"
              }`}
          >
            {s.label()}
          </A>
        ))}
      </div>
    </div>
  );
}
