// Settings form for WeatherWidget instances: place name + temperature unit.

import { createSignal } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";

const inputClass =
  "mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt";

export default function WeatherConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const [location, setLocation] = createSignal(String(props.config.location ?? ""));
  const [unit, setUnit] = createSignal(props.config.unit === "f" ? "f" : "c");

  const valid = () => location().trim().length > 0;

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_location")}
        <input
          type="text"
          value={location()}
          maxLength={100}
          placeholder="Berlin, Germany"
          onInput={(e) => setLocation(e.currentTarget.value)}
          class={inputClass}
        />
      </label>
      <label class="text-xs text-muted">
        {t("widgets.cfg_unit")}
        <select value={unit()} onChange={(e) => setUnit(e.currentTarget.value)} class={inputClass}>
          <option value="c">{t("widgets.unit_celsius")}</option>
          <option value="f">{t("widgets.unit_fahrenheit")}</option>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ location: location().trim(), unit: unit() })}
        disabled={!valid()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
