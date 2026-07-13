/**
 * SummaryField.tsx
 * Thin wrapper around AutosizeTextarea for the composer "summary" field —
 * used by Post (replacing its previous single-line <input>), Article, and
 * Webpage. Each composer supplies its own wrapper/visual classes so Post's
 * compact look and Article/Webpage's underlined look are preserved; only
 * the grow-up-to-5-lines-then-scroll sizing behavior is shared.
 */

import { type Component } from "solid-js";
import AutosizeTextarea from "./AutosizeTextarea";

export interface SummaryFieldProps {
  value: () => string;
  onInput: (v: string) => void;
  placeholder?: string;
  class?: string;
  maxLines?: number;
}

const SummaryField: Component<SummaryFieldProps> = (props) => (
  <AutosizeTextarea
    value={props.value}
    onInput={props.onInput}
    placeholder={props.placeholder}
    maxLines={props.maxLines ?? 5}
    class={props.class}
  />
);

export default SummaryField;
