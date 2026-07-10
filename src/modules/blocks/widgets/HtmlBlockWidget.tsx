// Free-form HTML block (config: { title?, html }). The markup is sanitised
// with DOMPurify before rendering — instance config reaches visitors via the
// page owner's layout, so scripts/handlers must never survive.

import DOMPurify from "dompurify";
import { createMemo, Show } from "solid-js";
import type { WidgetProps } from "@/shared/types/module.types";
import { editingWidgets } from "@/shared/store/widget-layout";
import { useI18n } from "@/i18n";

export default function HtmlBlockWidget(props: WidgetProps) {
  const { t } = useI18n();
  const title = () => String(props.config?.title ?? "");
  const html = () => String(props.config?.html ?? "");

  const clean = createMemo(() =>
    DOMPurify.sanitize(html(), { USE_PROFILES: { html: true } }),
  );

  return (
    <Show
      when={html()}
      fallback={
        <Show when={editingWidgets()}>
          <div class="bg-surface border border-rim rounded-xl px-4 py-3">
            <p class="text-xs text-muted">{t("widgets.not_configured")}</p>
          </div>
        </Show>
      }
    >
      <div class="bg-surface border border-rim rounded-xl overflow-hidden">
        <Show when={title()}>
          <div class="px-4 py-3">
            <h3 class="text-sm font-semibold text-txt">{title()}</h3>
          </div>
        </Show>
        <div
          class="px-4 py-3 prose prose-sm dark:prose-invert max-w-none text-txt"
          innerHTML={clean()}
        />
      </div>
    </Show>
  );
}
