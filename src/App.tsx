import { lazy, For, Show, createEffect, createMemo, type ParentComponent } from "solid-js";
import { Router, Route, useNavigate } from "@solidjs/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import Layout from "./Layout";
import { getRoutes } from "./router";
import { I18nProvider } from "./i18n";
import NotFound from "@/shared/views/NotFound";
import { getModule, isModuleActive } from "@/shared/lib/module-registry";
import { useInstalledApps } from "@/shared/store/nav-store";
import { queryClient } from "@/shared/lib/query-client";

const QueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/solid-query-devtools").then((m) => ({
        default: m.SolidQueryDevtools,
      })),
    )
  : () => null;

import.meta.glob("./modules/*/index.ts", { eager: true });

function Redirect(props: { to: string }) {
  const navigate = useNavigate();
  navigate(props.to, { replace: true });
  return null;
}

const ModuleGuard: ParentComponent<{ moduleId: string }> = (props) => {
  const installedApps = useInstalledApps();
  const navigate = useNavigate();

  const active = createMemo(() => isModuleActive(props.moduleId, installedApps()));

  createEffect(() => {
    if (!active()) navigate("/", { replace: true });
  });

  return <Show when={active()}>{props.children}</Show>;
};

export default function App() {
  return (
  <QueryClientProvider client={queryClient}>
  <I18nProvider>
    <Router>
      <Route path="/" component={Layout}>
        <Route path="/" component={() => <Redirect to="/hq" />} />
        <For each={getRoutes()()}>
          {(route) => {
            const Comp = lazy(route.component);
            const mid = route.moduleId;
            if (mid && getModule(mid)?.appName) {
              const Guarded = () => <ModuleGuard moduleId={mid}><Comp /></ModuleGuard>;
              return <Route path={route.path} component={Guarded} />;
            }
            return <Route path={route.path} component={Comp} />;
          }}
        </For>
        <Route path="*404" component={NotFound} />
      </Route>
    </Router>
    <QueryDevtools />
  </I18nProvider>
  </QueryClientProvider>
  );
}
