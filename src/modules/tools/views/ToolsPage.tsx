import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useLocation } from "@solidjs/router";
import { useI18n } from "@/i18n";
import SubPageLayout from "@/shared/views/SubPageLayout";
import type { SubPageItem } from "@/shared/views/SubPageLayout";
import { TOOLS } from "../tools-registry";

export default function ToolsPage() {
  const { t } = useI18n();
  const location = useLocation();

  const items: SubPageItem[] = TOOLS.map((tool) => ({
    path: tool.id,
    label: () => String(t(tool.labelKey)),
    icon: tool.icon,
  }));

  const activeKey = createMemo<string>(() => {
    const seg = location.pathname.replace(/^\/tools\/?/, "").split("/")[0];
    return TOOLS.some((tool) => tool.id === seg) ? seg : TOOLS[0].id;
  });

  const activeComponent = createMemo(
    () => TOOLS.find((tool) => tool.id === activeKey())?.component ?? TOOLS[0].component,
  );

  return (
    <SubPageLayout base="/tools" items={items} activeKey={activeKey()}>
      <div class="px-4 md:px-6 py-6">
        <Dynamic component={activeComponent()} />
      </div>
    </SubPageLayout>
  );
}
