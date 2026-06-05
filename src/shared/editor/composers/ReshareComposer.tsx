import { createSignal, Show } from "solid-js";
import { apiFetch } from "@/shared/lib/fetch";
import { useI18n } from "@/i18n";

interface Props {
  postUuid: string;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

export default function ReshareComposer(props: Props) {
  const { t } = useI18n();
  const [body, setBody] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function submit() {
    if (submitting()) return;
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch(`/api/item/${encodeURIComponent(props.postUuid)}/reshare`, {
        method: "POST",
        body: JSON.stringify({ body: body().trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = (data as any)?.error?.message ?? `Reshare failed: ${res.status}`;
        throw new Error(msg);
      }

      setBody("");
      props.onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reshare failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="mt-3 space-y-2">
      <textarea
        value={body()}
        onInput={(e) => setBody(e.currentTarget.value)}
        placeholder={t("editor.reshare_placeholder")}
        rows={3}
        class="w-full px-3 py-2 text-sm rounded-lg border border-rim bg-surface text-txt placeholder:text-muted
               focus:outline-none focus:ring-1 focus:ring-accent resize-none"
      />
      <Show when={error()}>
        <p class="text-xs text-red-500">{error()}</p>
      </Show>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          class="px-3 py-1 text-xs rounded-lg border border-rim text-muted hover:bg-elevated transition-colors"
        >
          {t("editor.cancel_btn")}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting()}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-accent text-accent-fg
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {submitting() ? t("editor.sharing") : t("editor.reshare_btn")}
        </button>
      </div>
    </div>
  );
}
