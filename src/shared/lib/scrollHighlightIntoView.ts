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

const SETTLE_DELAY_MS = 400;
const MAX_DURATION_MS = 3000;

export function scrollHighlightIntoView(el: HTMLElement): () => void {
  const scroll = () => el.scrollIntoView({ behavior: "smooth", block: "center" });

  const rafId = requestAnimationFrame(scroll);

  const container = findScrollContainer(el);
  const target =
    container === document.body
      ? document.body
      : ((container.firstElementChild as HTMLElement) ?? container);

  const start = Date.now();
  let pendingFrame: number | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    ro.disconnect();
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    if (settleTimer !== null) clearTimeout(settleTimer);
    container.removeEventListener("wheel", cleanup);
    container.removeEventListener("touchmove", cleanup);
    container.removeEventListener("pointerdown", cleanup);
  }

  const ro = new ResizeObserver(() => {
    if (Date.now() - start > MAX_DURATION_MS) {
      cleanup();
      return;
    }
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(scroll);

    if (settleTimer !== null) clearTimeout(settleTimer);
    settleTimer = setTimeout(cleanup, SETTLE_DELAY_MS);
  });
  ro.observe(target);

  settleTimer = setTimeout(cleanup, SETTLE_DELAY_MS);

  container.addEventListener("wheel", cleanup, { passive: true });
  container.addEventListener("touchmove", cleanup, { passive: true });
  container.addEventListener("pointerdown", cleanup, { passive: true });

  return () => {
    cancelAnimationFrame(rafId);
    cleanup();
  };
}
