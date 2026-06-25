import { render } from "solid-js/web";
import "./index.css";
import App from "./App";
import { loadTypography } from "@/shared/lib/typography";
import { loadBackground } from "@/shared/lib/background";
import { DARK_THEMES } from "@/shared/lib/useTheme";
import type { ThemeId } from "@/shared/types/theme.types";

const saved = (localStorage.getItem("hz-theme") as ThemeId) ?? "light";
document.documentElement.setAttribute("data-theme", saved);
document.documentElement.classList.toggle("dark", DARK_THEMES.has(saved));

loadTypography();
loadBackground();

render(() => <App />, document.getElementById("root")!);
