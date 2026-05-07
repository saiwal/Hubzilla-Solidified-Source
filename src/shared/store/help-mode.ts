// src/shared/store/help-mode.ts
import { createSignal } from "solid-js";

export type DocType = "user" | "dev";

const [helpMode, setHelpMode] = createSignal(false);
const [helpTarget, setHelpTarget] = createSignal<string | null>(null);
const [docType, setDocType] = createSignal<DocType>("user");

export function useHelpMode() {
  return {
    helpMode,
    helpTarget,
    docType,
    setDocType,
    enter: () => setHelpMode(true),
    exit: () => { setHelpMode(false); setHelpTarget(null); },
    pick: (target: string) => { setHelpTarget(target); setHelpMode(false); },
  };
}
