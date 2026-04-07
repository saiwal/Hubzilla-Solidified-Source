// src/shared/store/help-mode.ts
import { createSignal } from "solid-js";

const [helpMode, setHelpMode] = createSignal(false);
const [helpTarget, setHelpTarget] = createSignal<string | null>(null);

export function useHelpMode() {
  return {
    helpMode,
    helpTarget,
    enter: () => setHelpMode(true),
    exit: () => { setHelpMode(false); setHelpTarget(null); },
    pick: (target: string) => { setHelpTarget(target); setHelpMode(false); },
  };
}
