// Settings form for ClockWidget instances: clock (label + timezone) or
// countdown (label + target datetime).

import { createSignal, For, Show } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";

function timezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC", "America/New_York", "Europe/London", "Europe/Berlin", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"];
  }
}

const inputClass =
  "mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt";

export default function ClockConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const [mode, setMode] = createSignal(props.config.mode === "countdown" ? "countdown" : "clock");
  const [label, setLabel] = createSignal(String(props.config.label ?? ""));
  const [timezone, setTimezone] = createSignal(
    String(props.config.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
  );
  const [target, setTarget] = createSignal(String(props.config.target ?? ""));

  const valid = () => (mode() === "countdown" ? !isNaN(new Date(target()).getTime()) : !!timezone());

  const save = () => {
    const config: Record<string, unknown> = { mode: mode() };
    if (label().trim()) config.label = label().trim();
    if (mode() === "clock") config.timezone = timezone();
    else config.target = target();
    props.onSave(config);
  };

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_mode")}
        <select value={mode()} onChange={(e) => setMode(e.currentTarget.value)} class={inputClass}>
          <option value="clock">{t("widgets.clock_mode_clock")}</option>
          <option value="countdown">{t("widgets.clock_mode_countdown")}</option>
        </select>
      </label>

      <label class="text-xs text-muted">
        {t("widgets.cfg_label")}
        <input type="text" value={label()} maxLength={60}
               onInput={(e) => setLabel(e.currentTarget.value)} class={inputClass} />
      </label>

      <Show when={mode() === "clock"}>
        <label class="text-xs text-muted">
          {t("widgets.cfg_timezone")}
          <select value={timezone()} onChange={(e) => setTimezone(e.currentTarget.value)} class={inputClass}>
            <For each={timezones()}>{(tz) => <option value={tz}>{tz}</option>}</For>
          </select>
        </label>
      </Show>

      <Show when={mode() === "countdown"}>
        <label class="text-xs text-muted">
          {t("widgets.cfg_target")}
          <input type="datetime-local" value={target()}
                 onInput={(e) => setTarget(e.currentTarget.value)} class={inputClass} />
        </label>
      </Show>

      <button
        onClick={save}
        disabled={!valid()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
