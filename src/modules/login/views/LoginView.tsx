import { createSignal, onMount } from "solid-js";
import { fetchLoginToken, submitLogin } from "../api/api";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";

export default function LoginView() {
  const { t } = useI18n();
  const [token, setToken] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  onMount(async () => {
    try {
      setToken(await fetchLoginToken());
    } catch {
      toast.error("Failed to load login form. Please refresh the page.");
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      await submitLogin(username(), password(), token());
      // Full reload so auth state re-initialises from scratch
      window.location.href = "/hq";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
      // Refresh the token for the next attempt
      try {
        setToken(await fetchLoginToken());
      } catch {
        // ignore
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
          <h1 class="text-2xl font-bold text-txt">{t("auth.sign_in")}</h1>
          <p class="text-sm text-muted mt-1">{t("auth.continue_to")}</p>
        </div>

        <form onSubmit={handleSubmit} class="space-y-4" noValidate={false}>
          <div class="space-y-1">
            <label class="text-sm font-medium text-txt" for="login-username">
              {t("auth.email_or_username")}
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
              placeholder={t("auth.email_placeholder")}
            />
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium text-txt" for="login-password">
              {t("auth.password")}
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
              placeholder={t("auth.password_placeholder")}
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
            {loading() ? t("auth.signing_in") : t("auth.sign_in")}
          </button>
        </form>
      </div>
    </div>
  );
}
