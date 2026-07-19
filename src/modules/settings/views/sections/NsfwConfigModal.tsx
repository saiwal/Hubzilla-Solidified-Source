import { createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { apiFetch } from "@/shared/lib/fetch";
import { inputClass } from "../../store/FormHelpers";
import { useI18n } from "@/i18n";

interface NsfwSettings {
  nsfw_words: string;
  nsfw_installed: boolean;
}

async function fetchNsfwSettings(): Promise<NsfwSettings> {
  const res = await apiFetch("/spa/settings/privacy");
  const { data } = await res.json();
  return { nsfw_words: data.nsfw_words, nsfw_installed: data.nsfw_installed };
}

async function saveNsfwWords(words: string): Promise<void> {
  const res = await apiFetch("/spa/settings/privacy", {
    method: "POST",
    body: JSON.stringify({ nsfw_words: words }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message ?? "Save failed");
  }
}

interface Props {
  onClose: () => void;
}

export default function NsfwConfigModal(props: Props) {
  const { t } = useI18n();
  const [data] = createQueryResource("nsfw-config", fetchNsfwSettings);
  const [words, setWords] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Seed local editable state once the fetch resolves.
  const loaded = () => {
    const d = data();
    if (d && words() === null) setWords(d.nsfw_words);
    return d;
  };

  async function handleSave() {
    const w = words();
    if (w === null) return;
    setSaving(true);
    setError(null);
    try {
      await saveNsfwWords(w);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
      >
        <div class="w-full max-w-md rounded-2xl bg-surface border border-rim shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div class="flex items-center gap-3 p-4 border-b border-rim shrink-0">
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm text-txt truncate">{t("settings.privacy_nsfw")}</div>
              <div class="text-xs text-muted truncate">{t("settings.privacy_nsfw_desc")}</div>
            </div>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg text-muted hover:text-txt hover:bg-overlay transition-colors shrink-0"
              aria-label={t("post.modal_close")}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <Show
              when={loaded()}
              fallback={
                <div class="flex items-center justify-center gap-2 py-10 text-sm text-muted">
                  <span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <div class="space-y-1.5">
                <label class="block text-sm font-medium text-txt">{t("settings.privacy_nsfw_words")}</label>
                <textarea
                  rows="3"
                  value={words() ?? ""}
                  onInput={(e) => setWords(e.currentTarget.value)}
                  class={inputClass}
                />
                <p class="text-xs text-muted">{t("settings.privacy_nsfw_words_hint")}</p>
                <Show when={!loaded()!.nsfw_installed}>
                  <p class="text-xs text-amber-500">{t("settings.privacy_nsfw_app_hint")}</p>
                </Show>
              </div>
            </Show>

            <Show when={error()}>
              <p class="text-xs text-red-500">{error()}</p>
            </Show>
          </div>

          {/* Footer */}
          <div class="flex items-center gap-2 px-4 py-3 border-t border-rim shrink-0">
            <div class="flex-1" />
            <button
              onClick={props.onClose}
              class="px-3 py-1.5 rounded-lg text-xs border border-rim text-muted
                     hover:bg-overlay transition-colors"
            >
              {t("directory.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving() || words() === null}
              class="px-3 py-1.5 rounded-lg text-xs border border-rim text-muted
                     hover:border-accent hover:text-accent transition-colors
                     disabled:opacity-50 disabled:cursor-default flex items-center gap-1.5"
            >
              <Show when={saving()}>
                <span class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              </Show>
              {saving() ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
