import { lazy, For } from "solid-js";
import { Router, Route, useNavigate } from "@solidjs/router";
import Layout from "./Layout";
import { getRoutes } from "./router";

import "./modules/dashboard/index";

function Redirect(props: { to: string }) {
  const navigate = useNavigate();
  navigate(props.to, { replace: true });
  return null;
}

export default function App() {
  return (
    <Router>
      <Route path="/" component={Layout}>
        <Route path="/" component={() => <Redirect to="/hq" />} />
        <For each={getRoutes()()}>
          {(route) => <Route path={route.path} component={lazy(route.component)} />}
        </For>
      </Route>
    </Router>
  );
}
