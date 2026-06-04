import { createSignal, createResource } from "solid-js";
import { toast } from "@/shared/store/toast";

/**
 * Generic hook for a settings section form.
 *
 * - Fetches data via `fetcher` on mount.
 * - `handleSubmit` collects FormData, coerces numeric fields, calls `saver`,
 *   then refetches (or reloads if `reloadOn` predicate returns true).
 *
 * Usage:
 *   const { data, saving, handleSubmit } = useSectionForm({
 *     fetcher: fetchDisplaySettings,
 *     saver: saveDisplaySettings,
 *     numericFields: ["thread_allow", "itemspage", ...],
 *     reloadOn: (prev, next) => prev?.theme !== next.theme,
 *   });
 */
export function useSectionForm<T extends object>(options: {
  fetcher: () => Promise<T>;
  saver: (data: Partial<T>) => Promise<void>;
  numericFields?: string[];
  checkboxFields?: string[];
  reloadOn?: (prev: T | undefined, next: Partial<T>) => boolean;
}) {
  const {
    fetcher,
    saver,
    numericFields = [],
    checkboxFields = [],
    reloadOn,
  } = options;

  const [data, { refetch }] = createResource<T>(fetcher);
  const [saving, setSaving] = createSignal(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const raw = Object.fromEntries(new FormData(form)) as Record<
      string,
      string
    >;

    for (const f of checkboxFields) {
      if (!(f in raw)) raw[f] = "0";
    }
    // Coerce declared numeric fields; leave the rest as strings
    const payload = Object.fromEntries(
      Object.entries(raw).map(([k, v]) =>
        numericFields.includes(k) ? [k, Number(v)] : [k, v],
      ),
    ) as Partial<T>;

    setSaving(true);

    try {
      if (reloadOn?.(data(), payload)) {
        await saver(payload);
        window.location.reload();
        return;
      }
      await saver(payload);
      toast.success("Saved");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return { data, saving, handleSubmit };
}
