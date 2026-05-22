import { createSignal, untrack } from "solid-js";

export type BgFit = "tile" | "cover";

const [bgUrl, setBgUrlSignal] = createSignal(localStorage.getItem("hz-bg-url") ?? "");
const [bgFit, setBgFitSignal] = createSignal<BgFit>(
  (localStorage.getItem("hz-bg-fit") as BgFit) ?? "cover"
);

export function useBgUrl() { return bgUrl; }
export function useBgFit() { return bgFit; }

export function applyBackground(url: string, fit: BgFit): void {
  const root = document.documentElement;
  if (url) {
    root.style.setProperty("--hz-bg-image",  `url(${JSON.stringify(url)})`);
    root.style.setProperty("--hz-bg-size",   fit === "tile" ? "auto"     : "cover");
    root.style.setProperty("--hz-bg-repeat", fit === "tile" ? "repeat"   : "no-repeat");
    root.style.setProperty("--hz-bg-pos",    fit === "tile" ? "top left" : "center center");
  } else {
    root.style.removeProperty("--hz-bg-image");
    root.style.removeProperty("--hz-bg-size");
    root.style.removeProperty("--hz-bg-repeat");
    root.style.removeProperty("--hz-bg-pos");
  }
  localStorage.setItem("hz-bg-url", url);
  localStorage.setItem("hz-bg-fit", fit);
}

export function setBgUrl(url: string) {
  setBgUrlSignal(url);
  applyBackground(url, untrack(bgFit));
}

export function setBgFit(fit: BgFit) {
  setBgFitSignal(fit);
  applyBackground(untrack(bgUrl), fit);
}

export function loadBackground(): void {
  const url = localStorage.getItem("hz-bg-url") ?? "";
  const fit = (localStorage.getItem("hz-bg-fit") as BgFit) ?? "cover";
  setBgUrlSignal(url);
  setBgFitSignal(fit);
  applyBackground(url, fit);
}

/** Apply server-side values (both signals set atomically before DOM update). */
export function initBackground(url: string, fit: BgFit): void {
  setBgUrlSignal(url);
  setBgFitSignal(fit);
  applyBackground(url, fit);
}
