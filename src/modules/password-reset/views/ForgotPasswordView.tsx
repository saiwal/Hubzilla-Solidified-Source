import { createSignal, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { fetchPasswordResetToken, requestPasswordReset } from "../api/api";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";

export default function ForgotPasswordView() {
  const { t } = useI18n();
  const [token, setToken] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [sent, setSent] = createSignal(false);

  onMount(async () => {
    try {
      setToken(await fetchPasswordResetToken());
    } catch {
      toast.error(t("auth.load_form_error"));
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    try {
      await requestPasswordReset(email().trim(), token());
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.reset_request_failed"));
      setToken("");
      try {
        setToken(await fetchPasswordResetToken());
      } catch {
        toast.error(t("auth.load_form_error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-[60vh] flex items-center justify-center">
      <div class="w-full max-w-md bg-surface border border-rim rounded-2xl p-8 shadow-sm">
        <div class="mb-8 text-center">
          <div
            class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-txt mb-4
                   text-[11px] font-bold text-base select-none"
            style="color: var(--color-surface)"
          >
            Hz
          </div>
          <h1 class="text-2xl font-bold text-txt">{t("auth.reset_request_title")}</h1>
        </div>

        <Show
          when={!sent()}
          fallback={
            <div class="text-center space-y-4">
              <p class="text-sm text-txt font-medium">{t("auth.reset_check_email_title")}</p>
              <p class="text-sm text-muted">{t("auth.reset_check_email_desc")}</p>
              <A href="/login" class="inline-block text-sm text-accent hover:underline font-medium">
                {t("auth.sign_in")}
              </A>
            </div>
          }
        >
          <form onSubmit={handleSubmit} class="space-y-4">
            <p class="text-sm text-muted">{t("auth.reset_request_desc")}</p>

            <div class="space-y-1">
              <label class="text-sm font-medium text-txt" for="reset-email">
                {t("auth.reset_email_label")}
              </label>
              <input
                id="reset-email"
                type="email"
                autocomplete="email"
                required
                disabled={loading()}
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                class="w-full px-3 py-2 rounded-lg border border-rim bg-base text-txt text-sm
                       placeholder:text-muted
                       focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent
                       disabled:opacity-60 transition-colors"
                placeholder={t("auth.email_placeholder")}
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
              {loading() ? t("auth.reset_requesting") : t("auth.reset_request_submit")}
            </button>

            <p class="text-center text-sm text-muted">
              <A href="/login" class="text-accent hover:underline font-medium">
                {t("auth.sign_in")}
              </A>
            </p>
          </form>
        </Show>
      </div>
    </div>
  );
}
