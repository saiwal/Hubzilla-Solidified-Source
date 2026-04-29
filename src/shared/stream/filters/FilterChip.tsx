import type { JSX } from "solid-js";

export default function FilterChip(props: {
  active: boolean;
  onClick: () => void;
  label: string | JSX.Element;
}) {
  return (
    <button
      onClick={props.onClick}
      class={`px-3 py-1.5 text-sm rounded-lg border transition-colors shrink-0
        ${props.active
          ? "border-accent bg-accent-muted text-accent"
          : "border-rim bg-surface text-muted hover:bg-overlay"}`}
    >
      {props.label}
    </button>
  );
}
