import { createSignal } from "solid-js";

// User opt-in for desktop (Notification API) alerts, independent of the
// browser's own permission prompt. Persisted so we don't re-prompt every boot.
const STORAGE_KEY = "hz-desktop-notify";

const [enabled, setEnabledSignal] = createSignal(
  typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1",
);

export function desktopNotifyEnabled() {
  return enabled();
}

export function desktopNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function desktopNotifyPermission(): NotificationPermission {
  return desktopNotifySupported() ? Notification.permission : "denied";
}

export async function enableDesktopNotify(): Promise<boolean> {
  if (!desktopNotifySupported()) return false;
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  const ok = perm === "granted";
  setEnabledSignal(ok);
  localStorage.setItem(STORAGE_KEY, ok ? "1" : "0");
  return ok;
}

export function disableDesktopNotify() {
  setEnabledSignal(false);
  localStorage.setItem(STORAGE_KEY, "0");
}

// Only fires when the user opted in, permission is granted, and the tab isn't
// the one currently in focus (otherwise the in-app UI already shows it).
export function showDesktopNotification(
  title: string,
  options?: NotificationOptions & { onClick?: () => void },
) {
  if (!enabled() || !desktopNotifySupported()) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  const { onClick, ...rest } = options ?? {};
  try {
    const n = new Notification(title, rest);
    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
  } catch {
    // Notification constructor can throw on some platforms (e.g. iOS Safari)
  }
}
