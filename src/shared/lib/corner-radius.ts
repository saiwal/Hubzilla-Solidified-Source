export type CornerRadius = "none" | "sm" | "default" | "lg" | "xl";

const RADIUS_MAP: Record<CornerRadius, Record<string, string> | null> = {
  none: {
    "--radius-sm":  "0px",
    "--radius":     "0px",
    "--radius-md":  "0px",
    "--radius-lg":  "0px",
    "--radius-xl":  "0px",
    "--radius-2xl": "0px",
    "--radius-3xl": "0px",
  },
  sm: {
    "--radius-sm":  "0.0625rem",
    "--radius":     "0.125rem",
    "--radius-md":  "0.1875rem",
    "--radius-lg":  "0.25rem",
    "--radius-xl":  "0.375rem",
    "--radius-2xl": "0.5rem",
    "--radius-3xl": "0.75rem",
  },
  default: null,
  lg: {
    "--radius-sm":  "0.25rem",
    "--radius":     "0.375rem",
    "--radius-md":  "0.5rem",
    "--radius-lg":  "0.75rem",
    "--radius-xl":  "1rem",
    "--radius-2xl": "1.5rem",
    "--radius-3xl": "2rem",
  },
  xl: {
    "--radius-sm":  "0.375rem",
    "--radius":     "0.5rem",
    "--radius-md":  "0.75rem",
    "--radius-lg":  "1rem",
    "--radius-xl":  "1.5rem",
    "--radius-2xl": "2rem",
    "--radius-3xl": "2.5rem",
  },
};

const ALL_VARS = ["--radius-sm", "--radius", "--radius-md", "--radius-lg", "--radius-xl", "--radius-2xl", "--radius-3xl"];

export function applyCornerRadius(radius: CornerRadius): void {
  const root = document.documentElement;
  const overrides = RADIUS_MAP[radius];
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) root.style.setProperty(k, v);
  } else {
    for (const k of ALL_VARS) root.style.removeProperty(k);
  }
  localStorage.setItem("hz-corner-radius", radius);
}

export function loadCornerRadius(): void {
  const saved = (localStorage.getItem("hz-corner-radius") as CornerRadius) ?? "default";
  applyCornerRadius(saved);
}
