import type { JSX } from "solid-js";
import { Show } from "solid-js";

interface Props {
  title: string;
  description?: string;
  /** Optional action button(s) in the header (e.g. a Save button) */
  action?: JSX.Element;
  children: JSX.Element;
}

/**
 * Wrapper for sub-page content — provides consistent padding, a page title,
 * and an optional description + header action slot.
 *
 * Use inside every settings/connections sub-page:
 *
 *   <SubPageContent title="Profile" description="How others see you">
 *     ...fields...
 *   </SubPageContent>
 */
export default function SubPageContent(props: Props) {
  return (
    <div class="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Page header */}
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-0.5">
          <h2 class="text-base font-semibold text-txt">{props.title}</h2>
          <Show when={props.description}>
            <p class="text-sm text-muted">{props.description}</p>
          </Show>
        </div>
        <Show when={props.action}>
          <div class="shrink-0">{props.action}</div>
        </Show>
      </div>

      {/* Divider */}
      <hr class="border-rim" />

      {/* Content */}
      <div class="space-y-6">{props.children}</div>
    </div>
  );
}
