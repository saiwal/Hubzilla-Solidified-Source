// src/shared/lib/useDocs.ts
import { useI18n } from "@/i18n";
import { createResource, type Accessor } from "solid-js";
import type { DocType } from "@/shared/store/help-mode";

export function useDocs(path: string, docType: Accessor<DocType>) {
  const { locale } = useI18n();

  return createResource(
    () => ({
      lang: locale(),
      type: docType(),
    }),
    async ({ lang, type }) => {
      const res = await fetch(
        `/view/theme/solidified/docs/${type}/${lang}/${path}.txt`
      );

      if (!res.ok) {
        const fallback = await fetch(
          `/view/theme/solidified/docs/${type}/en/${path}.txt`
        );

        if (!fallback.ok) return null;

        return fallback.text();
      }

      return res.text();
    }
  );
}
