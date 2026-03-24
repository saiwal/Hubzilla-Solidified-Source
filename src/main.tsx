import "./index.css";
import { render } from "solid-js/web";
import { Router, Route } from "@solidjs/router";
import { For, lazy, Suspense } from "solid-js";
import type { Component } from "solid-js";
import Layout from "./app/layout/Layout";
import { useNavigate } from "@solidjs/router";

function RedirectToRoot() {
  const navigate = useNavigate();
  navigate("/", { replace: true });
  return null;
}

const modules = import.meta.glob<{
  default: Component;
}>("./modules/**/routes.tsx");

const ChannelPage = lazy(() => import("./modules/channel/routes"));

const routes = [
  ...Object.entries(modules).map(([path, loader]) => {
    const match = path.match(/\.\/modules\/([^/]+)\/routes\.tsx$/);
    const name = match?.[1] ?? "";
    return {
      path: name === "dashboard" ? "/" : `/${name}`,
      component: lazy(loader),
    };
  }),
  // Parameterised channel route — must come before the wildcard
  { path: "/channel/:nick", component: ChannelPage },
  { path: "*", component: RedirectToRoot },
];

render(
  () => (
    <Router>
      <Route path="/" component={Layout}>
        <Suspense fallback={<div>Loading...</div>}>
          <For each={routes}>
            {(r) => (
              <Route path={r.path} component={r.component} />
            )}
          </For>
        </Suspense>
      </Route>
    </Router>
  ),
  document.getElementById("root")!
);
