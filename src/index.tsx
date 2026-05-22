import { render } from "solid-js/web";
import "./index.css";
import App from "./App";
import { initPWA } from './pwa';
import { loadTypography } from "@/shared/lib/typography";

const saved = localStorage.getItem("theme") ?? "light";
document.documentElement.setAttribute("data-theme", saved);
const darkThemes = ["dark","nord","dracula","monokai","gruvbox-dark","catppuccin-mocha","solarized-dark","tokyo-night"];
document.documentElement.classList.toggle("dark", darkThemes.includes(saved));

loadTypography();
initPWA();

render(() => <App />, document.getElementById("root")!);
