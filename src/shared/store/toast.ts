import { createSignal } from "solid-js";

export type ToastType = "error" | "success" | "info" | "warning";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  onClick?: () => void;
}

const [toasts, setToasts] = createSignal<Toast[]>([]);
let _id = 0;

function add(type: ToastType, message: string, duration = 4000, onClick?: () => void): void {
  const id = ++_id;
  setToasts((prev) => [...prev, { id, type, message, onClick }]);
  if (duration > 0) setTimeout(() => dismiss(id), duration);
}

export function dismiss(id: number): void {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

export { toasts };

export const toast = {
  error:   (msg: string, duration?: number, onClick?: () => void) => add("error",   msg, duration, onClick),
  success: (msg: string, duration?: number, onClick?: () => void) => add("success", msg, duration, onClick),
  info:    (msg: string, duration?: number, onClick?: () => void) => add("info",    msg, duration, onClick),
  warning: (msg: string, duration?: number, onClick?: () => void) => add("warning", msg, duration, onClick),
};
