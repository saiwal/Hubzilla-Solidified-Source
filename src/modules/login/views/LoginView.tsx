import { createSignal, onMount, Show } from "solid-js";
import { fetchLoginToken, submitLogin } from "../api/api";

export default function LoginView() {
  const [token, setToken] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  onMount(async () => {
    try {
      setToken(await fetchLoginToken());
    } catch {
      setError("Failed to load login form. Please refresh the page.");
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await submitLogin(username(), password(), token());
      // Full reload so auth state re-initialises from scratch
      window.location.href = "/hq";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
      // Refresh the token for the next attempt
      try {
        setToken(await fetchLoginToken());
      } catch {
        // ignore — the user will see the error and can refresh
      }
    }
  };

  return (
    <div class="min-h-[60vh] flex items-center justify-center">
      <div class="w-full max-w-md bg-surface border border-rim rounded-2xl p-8 shadow-sm">
        {/* Brand */}
        <div class="mb-8 text-center">
          <div
            class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-txt mb-4
                   text-[11px] font-bold text-base select-none"
            style="color: var(--color-surface)"
          >
            Hz
          </div>
          <h1 class="text-2xl font-bold text-txt">Sign in</h1>
          <p class="text-sm text-muted mt-1">to continue to Hubzilla</p>
        </div>

        <form onSubmit={handleSubmit} class="space-y-4" noValidate={false}>
          <Show when={error()}>
            <div
              class="p-3 rounded-lg border text-sm
                     bg-red-50 border-red-200 text-red-700
                     dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
              role="alert"
            >
              {error()}
            </div>
          </Show>

          <div class="space-y-1">
            <label class="text-sm font-medium text-txt" for="login-username">
              Email or username
            </label>
            <input
              id="login-username"
              type="text"
              autocomplete="username"
              required
              disabled={loading()}
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              class="w-full px-3 py-2 rounded-lg border border-rim bg-base text-txt text-sm
                     placeholder:text-muted
                     focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                     disabled:opacity-60 transition-colors"
              placeholder="you@example.com or yournick"
            />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-txt" for="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autocomplete="current-password"
              required
              disabled={loading()}
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="w-full px-3 py-2 rounded-lg border border-rim bg-base text-txt text-sm
                     placeholder:text-muted
                     focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                     disabled:opacity-60 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading() || !token()}
            class="w-full py-2.5 px-4 rounded-lg bg-accent text-accent-fg font-medium text-sm
                   hover:opacity-90 active:opacity-80
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-accent/40
                   transition-opacity"
          >
            {loading() ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
