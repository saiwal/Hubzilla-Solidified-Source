// src/pwa.ts
import { toast } from "@/shared/store/toast";

export function initPWA() {
  window.addEventListener('pwa-update-available', () => {
    toast.info("Update available — reload to apply", 0);
  });
}
