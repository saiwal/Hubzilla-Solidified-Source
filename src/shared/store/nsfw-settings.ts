// shared/store/nsfw-settings.ts
import { createSignal } from "solid-js";
import { parseNsfwWords } from "@/shared/lib/nsfw";

const [nsfwWords, setNsfwWords] = createSignal<string[]>([]);

export function initNsfwWords(raw: string | undefined) {
  setNsfwWords(raw ? parseNsfwWords(raw) : []);
}

export function nsfwWordsList(): string[] {
  return nsfwWords();
}
