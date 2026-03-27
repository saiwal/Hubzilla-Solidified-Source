import { lazy, For } from "solid-js";
import { Router, Route, useNavigate } from "@solidjs/router";
import Layout from "./Layout";
import { getRoutes } from "./router";
import { I18nProvider } from "./i18n";

import.meta.glob("./modules/*/index.ts", { eager: true });

function Redirect(props: { to: string }) {
  const navigate = useNavigate();
  navigate(props.to, { replace: true });
  return null;
}

export default function App() {
  return (
  <I18nProvider>
    <Router>
      <Route path="/" component={Layout}>
        <Route path="/" component={() => <Redirect to="/hq" />} />
        <For each={getRoutes()()}>
          {(route) => <Route path={route.path} component={lazy(route.component)} />}
        </For>
      </Route>
    </Router>
  </I18nProvider>
  );
}
