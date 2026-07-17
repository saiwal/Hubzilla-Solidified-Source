import { createSignal, Show, Switch, Match } from "solid-js";
import { A } from "@solidjs/router";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";

type Mode = "file" | "migrate";

export default function ImportChannelView() {
  const { t } = useI18n();
  const [mode, setMode] = createSignal<Mode>("file");

  // ── Shared / file-upload state ──────────────────────────────────────────

  const [importFile, setImportFile] = createSignal<File | null>(null);
  const [makePrimary, setMakePrimary] = createSignal(false);
  const [newname, setNewname] = createSignal("");
  const [localPassword, setLocalPassword] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function handleImport() {
    const file = importFile();
    if (!file) return;

    setBusy(true);
    try {
      const { getCsrfToken } = await import("@/shared/lib/csrf");
      const token = await getCsrfToken().catch(() => "");

      const fd = new FormData();
      fd.append("file", file, file.name);
      if (makePrimary()) fd.append("make_primary", "1");
      if (newname().trim()) fd.append("newname", newname().trim());
      if (localPassword()) fd.append("password", localPassword());

      const res = await fetch("/spa/portability/import", {
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
      setBusy(false);
    }
  }

  // ── Remote-credential migration state ───────────────────────────────────

  const [oldAddress, setOldAddress] = createSignal("");
  const [oldEmail, setOldEmail] = createSignal("");
  const [oldPassword, setOldPassword] = createSignal("");

  async function handleMigrate() {
    if (!oldAddress().trim() || !oldEmail().trim() || !oldPassword()) return;

    setBusy(true);
    try {
      const { apiFetch } = await import("@/shared/lib/fetch");
      const res = await apiFetch("/spa/portability/migrate", {
        method: "POST",
        body: JSON.stringify({
          old_address: oldAddress().trim(),
          email: oldEmail().trim(),
          password: oldPassword(),
          make_primary: makePrimary() ? 1 : 0,
          newname: newname().trim() || undefined,
          local_password: localPassword() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Migration failed");

      toast.success(t("settings.portability_import_success"));
      window.location.href = json.data?.redirect ?? "/";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("settings.portability_import_failed"));
      setBusy(false);
    }
  }

  return (
    <div class="min-h-[60vh] flex items-center justify-center py-8">
      <div class="w-full max-w-lg bg-surface border border-rim rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div class="mb-2 text-center">
          <h1 class="text-xl font-bold text-txt">{t("settings.portability_import_title")}</h1>
          <p class="text-sm text-muted mt-1">{t("settings.portability_import_desc")}</p>
        </div>

        {/* Mode toggle */}
        <div class="flex rounded-lg border border-rim overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setMode("file")}
            class={`flex-1 py-2 font-medium transition-colors ${
              mode() === "file" ? "bg-accent text-accent-fg" : "text-txt hover:bg-elevated"
            }`}
          >
            {t("settings.portability_mode_file")}
          </button>
          <button
            type="button"
            onClick={() => setMode("migrate")}
            class={`flex-1 py-2 font-medium transition-colors ${
              mode() === "migrate" ? "bg-accent text-accent-fg" : "text-txt hover:bg-elevated"
            }`}
          >
            {t("settings.portability_mode_migrate")}
          </button>
        </div>

        <Switch>
          <Match when={mode() === "file"}>
            <div class="space-y-2">
              <label class="block text-xs font-medium text-muted">
                {t("settings.portability_import_file_label")}
              </label>
              <input
                type="file"
                accept=".json,application/json"
                disabled={busy()}
                onChange={(e) => setImportFile(e.currentTarget.files?.[0] ?? null)}
                class="block w-full text-sm text-txt file:mr-3 file:px-3 file:py-1.5 file:rounded-lg
                       file:border-0 file:bg-elevated file:text-txt file:text-sm
                       file:cursor-pointer cursor-pointer"
              />
            </div>
          </Match>

          <Match when={mode() === "migrate"}>
            <div class="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-900/10 p-3">
              <p class="text-xs text-amber-800 dark:text-amber-300">
                {t("settings.portability_migrate_warning")}
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-medium text-muted">
                {t("settings.portability_old_address_label")}
              </label>
              <input
                type="text"
                value={oldAddress()}
                onInput={(e) => setOldAddress(e.currentTarget.value)}
                placeholder={t("settings.portability_old_address_placeholder")}
                disabled={busy()}
                class="w-full px-3 py-2 rounded-lg border border-rim bg-surface
                       text-txt text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-medium text-muted">
                {t("settings.portability_old_email_label")}
              </label>
              <input
                type="email"
                value={oldEmail()}
                onInput={(e) => setOldEmail(e.currentTarget.value)}
                autocomplete="off"
                disabled={busy()}
                class="w-full px-3 py-2 rounded-lg border border-rim bg-surface
                       text-txt text-sm outline-none focus:border-accent transition-colors"
              />
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-medium text-muted">
                {t("settings.portability_old_password_label")}
              </label>
              <input
                type="password"
                value={oldPassword()}
                onInput={(e) => setOldPassword(e.currentTarget.value)}
                autocomplete="off"
                disabled={busy()}
                class="w-full px-3 py-2 rounded-lg border border-rim bg-surface
                       text-txt text-sm outline-none focus:border-accent transition-colors"
              />
            </div>
          </Match>
        </Switch>

        <div class="space-y-2">
          <label class="block text-xs font-medium text-muted">
            {t("settings.portability_newname_label")}
          </label>
          <input
            type="text"
            value={newname()}
            onInput={(e) => setNewname(e.currentTarget.value)}
            placeholder={t("settings.portability_newname_placeholder")}
            disabled={busy()}
            class="w-full px-3 py-2 rounded-lg border border-rim bg-surface
                   text-txt text-sm outline-none focus:border-accent transition-colors"
          />
        </div>

        <label class="flex items-center gap-2 text-sm text-txt cursor-pointer">
          <input
            type="checkbox"
            checked={makePrimary()}
            onChange={(e) => setMakePrimary(e.currentTarget.checked)}
            disabled={busy()}
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
              value={localPassword()}
              onInput={(e) => setLocalPassword(e.currentTarget.value)}
              placeholder={t("settings.danger_password_placeholder")}
              autocomplete="current-password"
              disabled={busy()}
              class="w-full px-3 py-2 rounded-lg border border-rim bg-surface
                     text-txt text-sm outline-none focus:border-accent transition-colors"
            />
          </div>
        </Show>

        <Switch>
          <Match when={mode() === "file"}>
            <button
              type="button"
              disabled={!importFile() || busy()}
              onClick={handleImport}
              class="w-full px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {busy() ? t("settings.portability_importing") : t("settings.portability_import_btn")}
            </button>
          </Match>
          <Match when={mode() === "migrate"}>
            <button
              type="button"
              disabled={!oldAddress().trim() || !oldEmail().trim() || !oldPassword() || busy()}
              onClick={handleMigrate}
              class="w-full px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {busy() ? t("settings.portability_migrating") : t("settings.portability_migrate_btn")}
            </button>
          </Match>
        </Switch>

        <p class="text-xs text-muted text-center pt-2">
          <A href="/new_channel" class="text-accent hover:underline">
            {t("channel_create.title")}
          </A>
        </p>
      </div>
    </div>
  );
}
