import { createSignal, onCleanup } from "solid-js";
import { computePosition, autoUpdate, flip, shift, offset } from "@floating-ui/dom";
import type { Placement } from "@floating-ui/dom";

export interface UseFloatingOptions {
  placement?: Placement;
  /** Gap between reference and floating element in px. Default: 8 */
  offset?: number;
}

/**
 * Solid composable that positions a floating element relative to a reference.
 *
 * Usage:
 *   const { x, y, placement, mount, unmount } = useFloating({ placement: "top" });
 *
 *   // Call mount() once both elements are in the DOM:
 *   mount(referenceEl, floatingEl);
 *
 *   // Apply position:
 *   style={{ position: "fixed", top: `${y()}px`, left: `${x()}px` }}
 */
export function useFloating(options: UseFloatingOptions = {}) {
  const [x, setX] = createSignal(0);
  const [y, setY] = createSignal(0);
  const [placement, setPlacement] = createSignal<Placement>(
    options.placement ?? "bottom",
  );

  let stopUpdate: (() => void) | undefined;

  function mount(reference: Element, floating: HTMLElement) {
    stopUpdate?.();
    stopUpdate = autoUpdate(reference, floating, async () => {
      const pos = await computePosition(reference, floating, {
        placement: options.placement ?? "bottom",
        middleware: [offset(options.offset ?? 8), flip(), shift({ padding: 8 })],
      });
      setX(pos.x);
      setY(pos.y);
      setPlacement(pos.placement);
    });
  }

  function unmount() {
    stopUpdate?.();
    stopUpdate = undefined;
  }

  onCleanup(unmount);
  return { x, y, placement, mount, unmount };
}
