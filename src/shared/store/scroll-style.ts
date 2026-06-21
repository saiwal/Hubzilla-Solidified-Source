import { createSignal } from "solid-js";

export type ScrollStyle = "endless" | "load_more";

const [style, setStyleGlobal] = createSignal<ScrollStyle>(
  (localStorage.getItem("hz-scroll-style") as ScrollStyle | null) ?? "endless"
);

export function useScrollStyle() { return style; }

export function setScrollStyle(value: ScrollStyle) {
  setStyleGlobal(value);
  localStorage.setItem("hz-scroll-style", value);
}
