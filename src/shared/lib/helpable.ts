// src/shared/lib/helpable.ts
import { useHelpMode } from "@/shared/store/help-mode";

export function helpable(el: HTMLElement, accessor: () => string) {
  const { helpMode, pick } = useHelpMode();

  const onClick = (e: MouseEvent) => {
    if (!helpMode()) return;
    e.preventDefault();
    e.stopPropagation();
    pick(accessor());
  };

  const onMouseEnter = () => {
    if (!helpMode()) return;
    el.style.outline = "2px solid #60a5fa";
    el.style.outlineOffset = "2px";
    el.style.borderRadius = "6px";
    el.style.cursor = "help";
  };

  const onMouseLeave = () => {
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.style.borderRadius = "";
    el.style.cursor = "";
  };

  el.addEventListener("click", onClick, true);
  el.addEventListener("mouseenter", onMouseEnter);
  el.addEventListener("mouseleave", onMouseLeave);
}
