import { createSignal, createEffect, onCleanup } from "solid-js";
import { useFloating, type UseFloatingOptions } from "./useFloating";

/**
 * Composable for button→panel dropdowns.
 * Combines open state, floating-ui positioning, and click-outside dismissal.
 *
 * Usage:
 *   const { open, toggle, setOpen, floatStyle, setTriggerRef, setPanelRef } =
 *     useDropdown({ placement: "bottom-start" });
 *
 *   <button ref={setTriggerRef} onClick={toggle}>…</button>
 *   <Presence>
 *     <Show when={open()}>
 *       <Motion.div ref={(el) => setPanelRef(el)} style={floatStyle()} …>…</Motion.div>
 *     </Show>
 *   </Presence>
 */
export function useDropdown(options: UseFloatingOptions = {}) {
  const [open, setOpen] = createSignal(false);

  let triggerEl: Element | undefined;
  let panelEl: HTMLElement | undefined;

  const { x, y, mount, unmount } = useFloating(options);

  // Render effects (refs) run before user effects, so panelEl is assigned
  // by the time this fires after open() becomes true.
  createEffect(() => {
    if (open() && triggerEl && panelEl) mount(triggerEl, panelEl);
    else unmount();
  });

  const onDocClick = (e: MouseEvent) => {
    const t = e.target as Node;
    if (!triggerEl?.contains(t) && !panelEl?.contains(t)) setOpen(false);
  };
  document.addEventListener("click", onDocClick);
  onCleanup(() => document.removeEventListener("click", onDocClick));

  return {
    open,
    setOpen,
    toggle: () => setOpen((o) => !o),
    x,
    y,
    floatStyle: () =>
      ({ position: "fixed" as const, top: `${y()}px`, left: `${x()}px` }),
    setTriggerRef: (el: Element) => { triggerEl = el; },
    setPanelRef: (el: HTMLElement) => { panelEl = el; },
  };
}
