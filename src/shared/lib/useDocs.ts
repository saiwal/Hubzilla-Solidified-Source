// src/shared/lib/useDocs.ts
import { useI18n } from "@/i18n";
import { createResource } from "solid-js";

export function useDocs(path: string) {
  // path examples:
  //   "network/stream-filters"
  //   "shared/post-composer"
  //   "settings/index"

  const { locale } = useI18n();

  return createResource(
    () => locale(),
    async (lang) => {
      const res = await fetch(`/view/theme/solidified/assets/docs/${lang}/${path}.txt`);
      if (!res.ok) {
				console.log("Failed");
        const fallback = await fetch(`/view/theme/solidified/assets/docs/en/${path}.txt`);
        if (!fallback.ok) return null;
        return fallback.text();
      }
			console.log(res.text);
      return res.text();
    }
  );
}
