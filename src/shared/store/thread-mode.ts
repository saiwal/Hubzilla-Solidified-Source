import { createSignal } from "solid-js";

const [threaded, setThreadedGlobal] = createSignal(
  localStorage.getItem("hz-thread-mode") !== "flat"
);

export function useThreadMode() { return threaded; }

export function setThreadMode(value: boolean) {
  setThreadedGlobal(value);
  localStorage.setItem("hz-thread-mode", value ? "threaded" : "flat");
}
