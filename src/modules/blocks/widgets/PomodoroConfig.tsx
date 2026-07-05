// Settings form for PomodoroWidget instances: focus and break durations.

import { createSignal, For } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";

const WORK_OPTIONS = [15, 25, 45, 60];
const BREAK_OPTIONS = [5, 10, 15];

const inputClass =
  "mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt";

export default function PomodoroConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const [work, setWork] = createSignal(Number(props.config.work ?? 25));
  const [brk, setBrk] = createSignal(Number(props.config.break ?? 5));

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_work_min")}
        <select value={String(work())} onChange={(e) => setWork(Number(e.currentTarget.value))} class={inputClass}>
          <For each={WORK_OPTIONS}>{(n) => <option value={String(n)}>{n}</option>}</For>
        </select>
      </label>
      <label class="text-xs text-muted">
        {t("widgets.cfg_break_min")}
        <select value={String(brk())} onChange={(e) => setBrk(Number(e.currentTarget.value))} class={inputClass}>
          <For each={BREAK_OPTIONS}>{(n) => <option value={String(n)}>{n}</option>}</For>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ work: work(), break: brk() })}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
