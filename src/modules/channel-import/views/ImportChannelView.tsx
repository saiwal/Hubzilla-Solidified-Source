import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";

export default function ImportChannelView() {
  const { t } = useI18n();

  const [importFile, setImportFile] = createSignal<File | null>(null);
  const [makePrimary, setMakePrimary] = createSignal(false);
  const [newname, setNewname] = createSignal("");
  const [importPassword, setImportPassword] = createSignal("");
  const [importing, setImporting] = createSignal(false);

  async function handleImport() {
    const file = importFile();
    if (!file) return;

    setImporting(true);
    try {
      const { getCsrfToken } = await import("@/shared/lib/csrf");
      const token = await getCsrfToken().catch(() => "");

      const fd = new FormData();
      fd.append("file", file, file.name);
      if (makePrimary()) fd.append("make_primary", "1");
      if (newname().trim()) fd.append("newname", newname().trim());
      if (importPassword()) fd.append("password", importPassword());

      const res = await fetch("/api/portability/import", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": token },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Import failed");

      toast.success(t("settings.portability_import_success"));
      window.location.href = json.data?.redirect ?? "/";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("settings.portability_import_failed"));
      setImporting(false);
    }
  }

  return (
    <div class="min-h-[60vh] flex items-center justify-center py-8">
      <div class="w-full max-w-lg bg-surface border border-rim rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div class="mb-2 text-center">
          <h1 class="text-xl font-bold text-txt">{t("settings.portability_import_title")}</h1>
          <p class="text-sm text-muted mt-1">{t("settings.portability_import_desc")}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-xs font-medium text-muted">
            {t("settings.portability_import_file_label")}
          </label>
          <input
            type="file"
            accept=".json,application/json"
            disabled={importing()}
            onChange={(e) => setImportFile(e.currentTarget.files?.[0] ?? null)}
            class="block w-full text-sm text-txt file:mr-3 file:px-3 file:py-1.5 file:rounded-lg
                   file:border-0 file:bg-elevated file:text-txt file:text-sm
                   file:cursor-pointer cursor-pointer"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-xs font-medium text-muted">
            {t("settings.portability_newname_label")}
          </label>
          <input
            type="text"
            value={newname()}
            onInput={(e) => setNewname(e.currentTarget.value)}
            placeholder={t("settings.portability_newname_placeholder")}
            disabled={importing()}
            class="w-full px-3 py-2 rounded-lg border border-rim bg-surface
                   text-txt text-sm outline-none focus:border-accent transition-colors"
          />
        </div>

        <label class="flex items-center gap-2 text-sm text-txt cursor-pointer">
          <input
            type="checkbox"
            checked={makePrimary()}
            onChange={(e) => setMakePrimary(e.currentTarget.checked)}
            disabled={importing()}
            class="rounded border-rim"
          />
          {t("settings.portability_make_primary")}
        </label>

        <Show when={makePrimary()}>
          <div class="space-y-2">
            <label class="block text-xs font-medium text-muted">
              {t("settings.portability_import_password_label")}
            </label>
            <input
              type="password"
              value={importPassword()}
              onInput={(e) => setImportPassword(e.currentTarget.value)}
              placeholder={t("settings.danger_password_placeholder")}
              autocomplete="current-password"
              disabled={importing()}
              class="w-full px-3 py-2 rounded-lg border border-rim bg-surface
                     text-txt text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
        </Show>

        <button
          type="button"
          disabled={!importFile() || importing()}
          onClick={handleImport}
          class="w-full px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {importing() ? t("settings.portability_importing") : t("settings.portability_import_btn")}
        </button>

        <p class="text-xs text-muted text-center pt-2">
          <A href="/new_channel" class="text-accent hover:underline">
            {t("channel_create.title")}
          </A>
        </p>
      </div>
    </div>
  );
}
