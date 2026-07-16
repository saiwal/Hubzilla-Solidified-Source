/**
 * Scrolls a highlighted element into view and keeps it centered while the
 * surrounding layout is still settling (images loading, thread-expand
 * transitions, etc.). Self-terminates once layout is quiet for a bit, hits a
 * hard time cap, or the user starts scrolling manually.
 */
function findScrollContainer(el: HTMLElement): HTMLElement {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return document.body;
}

// Quiet period after the *last* observed layout change before we consider
// things settled and stop correcting.
const SETTLE_DELAY_MS = 500;
// Hard ceiling from mount, independent of activity — covers slow image
// loads (which can easily take longer than one settle window) while still
// guaranteeing we eventually stop correcting.
const MAX_DURATION_MS = 8000;

export function scrollHighlightIntoView(el: HTMLElement): () => void {
  const scroll = () => el.scrollIntoView({ behavior: "smooth", block: "center" });

  const rafId = requestAnimationFrame(scroll);

  const container = findScrollContainer(el);
  const target =
    container === document.body
      ? document.body
      : ((container.firstElementChild as HTMLElement) ?? container);

  let pendingFrame: number | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    ro.disconnect();
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    if (settleTimer !== null) clearTimeout(settleTimer);
    if (maxTimer !== null) clearTimeout(maxTimer);
    container.removeEventListener("wheel", cleanup);
    container.removeEventListener("touchmove", cleanup);
    container.removeEventListener("pointerdown", cleanup);
  }

  const ro = new ResizeObserver(() => {
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(scroll);

    // Only start (or push back) the quiet-period timer once something has
    // actually changed — a lone timer started at mount would disconnect us
    // before a slow-loading image ever gets the chance to fire a resize.
    if (settleTimer !== null) clearTimeout(settleTimer);
    settleTimer = setTimeout(cleanup, SETTLE_DELAY_MS);
  });
  ro.observe(target);

  maxTimer = setTimeout(cleanup, MAX_DURATION_MS);

  container.addEventListener("wheel", cleanup, { passive: true });
  container.addEventListener("touchmove", cleanup, { passive: true });
  container.addEventListener("pointerdown", cleanup, { passive: true });

  return () => {
    cancelAnimationFrame(rafId);
    cleanup();
  };
}
