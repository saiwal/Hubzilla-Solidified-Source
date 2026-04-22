import { render } from "solid-js/web";
import "./index.css";
import App from "./App";
import { initPWA } from './pwa';
initPWA();

render(() => <App />, document.getElementById("root")!);
