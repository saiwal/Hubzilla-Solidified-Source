import { onCleanup } from "solid-js";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";

export function usePWA() {
  const { t } = useI18n();
  const handler = () => toast.info(t("ui.pwa_update"), 0);
  window.addEventListener("pwa-update-available", handler);
  onCleanup(() => window.removeEventListener("pwa-update-available", handler));
}
