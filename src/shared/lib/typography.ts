export type FontSize = "small" | "medium" | "large";
export type FontFamily =
  | "system"
  | "serif"
  | "monospace"
  | "nunito"
  | "playfair"
  | "comfortaa"
  | "space-mono"
  | "pacifico"
  | "righteous"
  | "comic"
  | "opendyslexic";

const FONT_SIZES: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

const FONT_FAMILIES: Record<FontFamily, string> = {
  system:        "ui-sans-serif, system-ui, -apple-system, sans-serif",
  serif:         "ui-serif, Georgia, Cambria, serif",
  monospace:     'ui-monospace, "Cascadia Code", "Fira Code", monospace',
  nunito:        '"Nunito", ui-rounded, sans-serif',
  playfair:      '"Playfair Display", Georgia, serif',
  comfortaa:     '"Comfortaa", ui-rounded, sans-serif',
  "space-mono":  '"Space Mono", ui-monospace, monospace',
  pacifico:      '"Pacifico", cursive',
  righteous:     '"Righteous", "Impact", sans-serif',
  comic:         '"Comic Neue", "Comic Sans MS", "Comic Sans", cursive',
  opendyslexic:  '"OpenDyslexic", sans-serif',
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
