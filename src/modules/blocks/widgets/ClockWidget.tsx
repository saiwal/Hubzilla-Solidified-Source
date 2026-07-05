// World clock / countdown card (config: { mode, label?, timezone?, target? }).
// mode "clock" shows the current time in a chosen timezone; mode "countdown"
// counts down to a target date. Pure client-side.

import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { WidgetProps } from "@/shared/types/module.types";
import { editingWidgets } from "@/shared/store/widget-layout";
import { useI18n } from "@/i18n";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function ClockWidget(props: WidgetProps) {
  const { t } = useI18n();
  const mode = () => (props.config?.mode === "countdown" ? "countdown" : "clock");
  const label = () => String(props.config?.label ?? "");
  const timezone = () => String(props.config?.timezone ?? "");
  const target = () => String(props.config?.target ?? "");

  const configured = () => (mode() === "countdown" ? !!target() : !!timezone());

  const [now, setNow] = createSignal(Date.now());
  onMount(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(id));
  });

  const clockTime = () => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: timezone(),
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now());
    } catch {
      return ""; // unknown timezone id
    }
  };

  const clockDate = () => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: timezone(),
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(now());
    } catch {
      return "";
    }
  };

  const remainingMs = () => new Date(target()).getTime() - now();

  const countdownText = () => {
    const ms = remainingMs();
    if (isNaN(ms)) return "";
    if (ms <= 0) return t("widgets.countdown_reached");
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hms = `${pad2(Math.floor((s % 86400) / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
    return days > 0 ? `${days}d ${hms}` : hms;
  };

  return (
    <Show
      when={configured()}
      fallback={
        <Show when={editingWidgets()}>
          <div class="bg-surface border border-rim rounded-xl px-4 py-3">
            <p class="text-xs text-muted">{t("widgets.not_configured")}</p>
          </div>
        </Show>
      }
    >
      <div class="bg-surface border border-rim rounded-xl px-4 py-4 text-center">
        <Show when={label()}>
          <p class="text-xs font-medium text-muted mb-1 truncate">{label()}</p>
        </Show>

        <Show when={mode() === "clock"}>
          <p class="text-2xl font-semibold text-txt tabular-nums">{clockTime()}</p>
          <p class="text-xs text-muted mt-1">
            {clockDate()} · {timezone().split("/").pop()?.replace(/_/g, " ")}
          </p>
        </Show>

        <Show when={mode() === "countdown"}>
          <p
            class="text-2xl font-semibold tabular-nums"
            classList={{
              "text-accent": remainingMs() <= 0,
              "text-txt": remainingMs() > 0,
            }}
          >
            {countdownText()}
          </p>
        </Show>
      </div>
    </Show>
  );
}
