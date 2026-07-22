import { createSignal, Show } from "solid-js";
import { useI18n } from "@/i18n";

const inputClass =
  "w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-sm text-txt";

// Name entry form for creating or renaming a layout template — used by both
// the Layout Templates management screen and the inline "+ New template"
// flow in WebpageComposer.
export default function TemplateNameForm(props: {
  initial?: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = createSignal(props.initial ?? "");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await props.onSubmit(name().trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="bg-surface border border-rim rounded-xl p-3 space-y-2">
      <input
        type="text" value={name()} maxLength={60} class={inputClass}
        placeholder={t("webpages.template_name_placeholder") as string}
        onInput={(e) => setName(e.currentTarget.value)}
      />
      <Show when={error()}>
        <p class="text-xs text-red-500">{error()}</p>
      </Show>
      <div class="flex items-center justify-end gap-2">
        <button
          onClick={props.onCancel}
          class="px-3 py-1.5 rounded-lg text-xs text-muted hover:text-txt hover:bg-elevated transition-colors"
        >
          {t("webpages.cancel")}
        </button>
        <button
          onClick={submit}
          disabled={busy() || !name().trim()}
          class="px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
                 hover:brightness-110 transition-all disabled:opacity-40"
        >
          {t("webpages.save")}
        </button>
      </div>
    </div>
  );
}
