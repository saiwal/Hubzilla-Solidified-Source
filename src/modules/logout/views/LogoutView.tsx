import { onMount } from "solid-js";
import { getCsrfToken } from "@/shared/lib/csrf";
import { useI18n } from "@/i18n";

export default function LogoutView() {
  const { t } = useI18n();
  onMount(async () => {
    try {
      const csrf = await getCsrfToken();
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify({}),
      });
    } catch {
      // ignore — redirect regardless
    }
    window.location.href = "/login";
  });

  return (
    <div class="min-h-[60vh] flex items-center justify-center">
      <p class="text-sm text-muted">{t("auth.signing_out")}</p>
    </div>
  );
}
