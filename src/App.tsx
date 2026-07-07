import { lazy, For, Show, createEffect, createMemo, type Component, type ParentComponent } from "solid-js";
import { Router, Route, useNavigate, useLocation } from "@solidjs/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import Layout from "./Layout";
import { getRoutes } from "./router";
import { I18nProvider } from "./i18n";
import NotFound from "@/shared/views/NotFound";
import { getModule, isModuleActive } from "@/shared/lib/module-registry";
import { useInstalledApps } from "@/shared/store/nav-store";
import { useAuth } from "@/shared/store/auth-store";
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

// null = auth state not yet resolved (singleton resource still loading) — render
// nothing but don't redirect yet, to avoid a flash-redirect on page load.
const AuthGuard: ParentComponent = (props) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const loggedIn = createMemo(() => auth()?.isLoggedIn ?? null);

  createEffect(() => {
    if (loggedIn() === false) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?next=${next}`, { replace: true });
    }
  });

  return <Show when={loggedIn() !== false}>{props.children}</Show>;
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
            const mod = mid ? getModule(mid) : null;

            let Rendered: Component = Comp;
            if (mod?.appName) {
              const Inner = Rendered;
              Rendered = () => <ModuleGuard moduleId={mid!}><Inner /></ModuleGuard>;
            }
            if (mod?.requiresAuth) {
              const Inner = Rendered;
              Rendered = () => <AuthGuard><Inner /></AuthGuard>;
            }
            return <Route path={route.path} component={Rendered} />;
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
