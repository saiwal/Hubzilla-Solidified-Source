import { createSignal } from "solid-js";

const [enabled, setEnabledGlobal] = createSignal<boolean>(
  localStorage.getItem("hz-emoji-as-images") === "1"
);

export function useEmojiAsImages() { return enabled; }

export function setEmojiAsImages(value: boolean) {
  setEnabledGlobal(value);
  localStorage.setItem("hz-emoji-as-images", value ? "1" : "0");
}
