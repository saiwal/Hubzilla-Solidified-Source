import { createSignal } from "solid-js";

export type ToastType = "error" | "success" | "info" | "warning";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const [toasts, setToasts] = createSignal<Toast[]>([]);
let _id = 0;

function add(type: ToastType, message: string, duration = 4000): void {
  const id = ++_id;
  setToasts((prev) => [...prev, { id, type, message }]);
  if (duration > 0) setTimeout(() => dismiss(id), duration);
}

export function dismiss(id: number): void {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

export { toasts };

export const toast = {
  error:   (msg: string, duration?: number) => add("error",   msg, duration),
  success: (msg: string, duration?: number) => add("success", msg, duration),
  info:    (msg: string, duration?: number) => add("info",    msg, duration),
  warning: (msg: string, duration?: number) => add("warning", msg, duration),
};
