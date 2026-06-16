export type FontSize = "small" | "medium" | "large" | "xl";
export type FontFamily =
  | "system"
  | "serif"
  | "monospace"
  | "nunito"
  | "saira"
  | "share-tech"
  | "playfair"
  | "libre-baskerville"
  | "comfortaa"
  | "space-mono"
  | "iosevka"
  | "righteous"
  | "playwrite-england"
  | "comic"
  | "opendyslexic";

const FONT_SIZES: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  xl: "21px",
};

const D = '"Noto Sans Devanagari"';

const FONT_FAMILIES: Record<FontFamily, string> = {
  system:             `ui-sans-serif, system-ui, -apple-system, ${D}, sans-serif`,
  serif:              `ui-serif, Georgia, Cambria, ${D}, serif`,
  monospace:          `ui-monospace, "Cascadia Code", "Fira Code", ${D}, monospace`,
  nunito:             `"Nunito", ${D}, ui-rounded, sans-serif`,
  saira:              `"Saira", ${D}, ui-sans-serif, sans-serif`,
  "share-tech":       `"Share Tech", ${D}, ui-sans-serif, sans-serif`,
  playfair:           `"Playfair Display", ${D}, Georgia, serif`,
  "libre-baskerville":`"Libre Baskerville", ${D}, Georgia, serif`,
  comfortaa:          `"Comfortaa", ${D}, ui-rounded, sans-serif`,
  "space-mono":       `"Space Mono", ${D}, ui-monospace, monospace`,
  iosevka:            `"Iosevka", ${D}, ui-monospace, monospace`,
  righteous:          `"Righteous", ${D}, "Impact", sans-serif`,
  "playwrite-england":`"Playwrite England Joined", ${D}, cursive`,
  comic:              `"Comic Neue", "Comic Sans MS", "Comic Sans", ${D}, cursive`,
  opendyslexic:       `"OpenDyslexic", ${D}, sans-serif`,
};

export function applyTypography(size: FontSize, family: FontFamily): void {
  document.documentElement.style.fontSize =
    FONT_SIZES[size] ?? FONT_SIZES.medium;
  document.documentElement.style.setProperty(
    "--hz-font-family",
    FONT_FAMILIES[family] ?? FONT_FAMILIES.system,
  );
  localStorage.setItem("hz-font-size", size);
  localStorage.setItem("hz-font-family", family);
}

export function loadTypography(): void {
  const size = (localStorage.getItem("hz-font-size") as FontSize) ?? "medium";
  const family =
    (localStorage.getItem("hz-font-family") as FontFamily) ?? "system";
  applyTypography(size, family);
}
