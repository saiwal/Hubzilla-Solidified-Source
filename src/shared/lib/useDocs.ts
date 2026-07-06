// src/shared/lib/useDocs.ts
import { useI18n } from "@/i18n";
import { type Accessor } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import type { DocType } from "@/shared/store/help-mode";

export function useDocs(path: string, docType: Accessor<DocType>) {
  const { locale } = useI18n();

  return createQueryResource(
    "docs",
    () => ({
      lang: locale(),
      type: docType(),
      path,
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
