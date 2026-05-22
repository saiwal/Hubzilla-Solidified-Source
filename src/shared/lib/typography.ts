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
  comic:         '"Comic Sans MS", "Comic Sans", cursive',
  opendyslexic:  '"OpenDyslexic", sans-serif',
};

// Fonts that require loading from Google Fonts
const GOOGLE_FONT_FAMILIES = new Set<FontFamily>([
  "nunito", "playfair", "comfortaa", "space-mono", "pacifico", "righteous",
]);

// OpenDyslexic is not on Google Fonts — loaded from a dedicated CDN
const OPENDYSLEXIC_HREF =
  "https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.css";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700" +
  "&family=Playfair+Display:ital,wght@0,400;0,600;1,400" +
  "&family=Comfortaa:wght@400;500;600;700" +
  "&family=Space+Mono:ital,wght@0,400;0,700;1,400" +
  "&family=Pacifico" +
  "&family=Righteous" +
  "&display=swap";

function injectStylesheet(id: string, href: string): void {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function applyTypography(size: FontSize, family: FontFamily): void {
  if (GOOGLE_FONT_FAMILIES.has(family))
    injectStylesheet("hz-google-fonts", GOOGLE_FONTS_HREF);
  if (family === "opendyslexic")
    injectStylesheet("hz-opendyslexic", OPENDYSLEXIC_HREF);
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
