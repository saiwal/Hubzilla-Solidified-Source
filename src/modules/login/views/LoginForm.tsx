import { createSignal, onMount } from "solid-js";
import { A } from "@solidjs/router";
import { fetchLoginToken, submitLogin, submitRmagic } from "../api/api";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";

interface LoginFormProps {
  // Path on this site to land on after login. Defaults to /hq for local
  // login and the site root for remote login.
  dest?: string;
}

export default function LoginForm(props: LoginFormProps) {
  const { t } = useI18n();
  const [token, setToken] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [remoteAddr, setRemoteAddr] = createSignal("");
  const [remoteLoading, setRemoteLoading] = createSignal(false);

  onMount(async () => {
    try {
      setToken(await fetchLoginToken());
    } catch {
      toast.error(t("auth.load_form_error"));
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      await submitLogin(username(), password(), token());
      // Full reload so auth state re-initialises from scratch
      window.location.href = props.dest ?? "/hq";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.login_failed"));
      setLoading(false);
      // Refresh the token for the next attempt
      try {
        setToken(await fetchLoginToken());
      } catch {
        // ignore
      }
    }
  };

  const handleRemoteSubmit = async (e: Event) => {
    e.preventDefault();
    setRemoteLoading(true);

    try {
      const url = await submitRmagic(remoteAddr().trim(), props.dest ?? "/");
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.login_failed"));
      setRemoteLoading(false);
    }
  };

  return (
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

      {/* Local login */}
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

      {/* Register link */}
      <p class="text-center text-sm text-muted mt-4">
        {t("auth.no_account_yet")}{" "}
        <A href="/register" class="text-accent hover:underline font-medium">
          {t("auth.register_link")}
        </A>
      </p>

      {/* Divider */}
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-rim" />
        </div>
        <div class="relative flex justify-center">
          <span class="px-3 bg-surface text-xs text-muted uppercase tracking-wide">
            {t("auth.or")}
          </span>
        </div>
      </div>

      {/* Remote login */}
      <form onSubmit={handleRemoteSubmit} class="space-y-3">
        <div class="space-y-1">
          <label class="text-sm font-medium text-txt" for="rmagic-addr">
            {t("auth.remote_address_label")}
          </label>
          <input
            id="rmagic-addr"
            name="address"
            type="text"
            autocomplete="email"
            required
            disabled={remoteLoading()}
            value={remoteAddr()}
            onInput={(e) => setRemoteAddr(e.currentTarget.value)}
            class="w-full px-3 py-2 rounded-lg border border-rim bg-base text-txt text-sm
                   placeholder:text-muted
                   focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                   disabled:opacity-60 transition-colors"
            placeholder={t("auth.remote_address_placeholder")}
          />
          <p class="text-xs text-muted">{t("auth.remote_login_hint")}</p>
        </div>
        <button
          type="submit"
          disabled={remoteLoading() || !remoteAddr().trim()}
          class="w-full py-2.5 px-4 rounded-lg border border-rim bg-base text-txt font-medium text-sm
                 hover:bg-elevated active:opacity-80
                 disabled:opacity-50 disabled:cursor-not-allowed
                 focus:outline-none focus:ring-2 focus:ring-accent/40
                 transition-colors"
        >
          {t("auth.remote_login_btn")}
        </button>
      </form>
    </div>
  );
}
