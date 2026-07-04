import { createResource, createSignal, createEffect, For, Show, batch } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import {
  fetchAdminThemes,
  fetchThemeOptions,
  saveThemeOptions,
  toggleTheme,
} from "../../api";
import type { ThemeField } from "../../types";
import { useI18n } from "@/i18n";

export default function ThemesSection() {
  const { t } = useI18n();
  const [result, { refetch }] = createResource(fetchAdminThemes);
  const [configTheme, setConfigTheme] = createSignal<string | null>(null);

  async function onToggle(name: string) {
    await toggleTheme(name);
    refetch();
  }

  return (
    <SubPageContent title={t("admin.themes_title")} description={t("admin.themes_desc")}>
      <Show when={result()} fallback={<Skeleton />}>
        {(r) => (
          <div class="space-y-2">
            <p class="text-sm text-muted">{r().themes.length} {t("admin.themes_found")}</p>
            <div class="space-y-2">
              <For each={r().themes}>
                {(theme) => (
                  <div class={`rounded-lg border p-3 bg-surface ${theme.current ? "border-accent" : "border-rim"}`}>
                    <div class="flex items-start justify-between gap-4">
                      <div class="space-y-0.5 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <p class="text-sm font-medium text-txt font-mono">{theme.name}</p>
                          <Show when={theme.current}>
                            <span class="px-1.5 py-0.5 text-xs rounded-full bg-accent/10 text-accent">{t("admin.default_badge")}</span>
                          </Show>
                          <Show when={theme.mobile}>
                            <span class="px-1.5 py-0.5 text-xs rounded-full bg-elevated text-muted">{t("admin.mobile_badge")}</span>
                          </Show>
                          <Show when={theme.experimental}>
                            <span class="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">{t("admin.experimental_badge")}</span>
                          </Show>
                          <Show when={!theme.compatible}>
                            <span class="px-1.5 py-0.5 text-xs rounded-full border border-red-300 text-red-600">{t("admin.incompatible_badge")}</span>
                          </Show>
                        </div>
                        <Show when={theme.description}>
                          <p class="text-xs text-muted">{theme.description}</p>
                        </Show>
                        <Show when={theme.version}>
                          <p class="text-xs text-muted">v{theme.version}</p>
                        </Show>
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        <Show when={theme.has_config}>
                          <button
                            onClick={() => setConfigTheme(configTheme() === theme.name ? null : theme.name)}
                            class={`px-2 py-1 text-xs rounded border transition-colors
                              ${configTheme() === theme.name
                                ? "border-accent text-accent bg-accent/5"
                                : "border-rim text-muted hover:bg-elevated"}`}
                          >
                            Configure
                          </button>
                        </Show>
                        <button
                          onClick={() => onToggle(theme.name)}
                          class={`px-2 py-1 text-xs rounded border transition-colors
                            ${theme.allowed
                              ? "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                              : "border-rim text-muted hover:bg-elevated"}`}
                        >
                          {theme.allowed ? "Allowed" : "Disabled"}
                        </button>
                      </div>
                    </div>

                    <Show when={configTheme() === theme.name}>
                      <ThemeConfigPanel theme={theme.name} />
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

function ThemeConfigPanel(props: { theme: string }) {
  const [opts] = createResource(() => props.theme, fetchThemeOptions);
  const [values, setValues] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [saved, setSaved] = createSignal(false);

  // Seed editable values once when the resource first loads
  createEffect(() => {
    const data = opts();
    if (!data) return;
    const init: Record<string, string> = {};
    for (const f of data.fields) init[f.key] = f.value ?? "";
    setValues(init);
  });

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function onSave() {
    const data = opts();
    if (!data?.fields.length) return;
    setSaving(true);
    try {
      const formData: Record<string, string> = {};
      for (const f of data.fields) {
        formData[f.key] = values()[f.key] ?? f.value ?? "";
      }
      await saveThemeOptions(props.theme, formData);
      batch(() => { setSaving(false); setSaved(true); });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div class="mt-3 pt-3 border-t border-rim">
      <Show when={opts.error}>
        <div class="text-xs text-red-600 dark:text-red-400 py-1">
          Failed to load options: {String(opts.error?.message ?? opts.error)}
        </div>
      </Show>
      <Show when={opts.loading}>
        <div class="text-xs text-muted py-2 animate-pulse">Loading options…</div>
      </Show>
      <Show when={opts() && !opts.loading}>
        <Show
          when={(opts()?.fields.length ?? 0) > 0}
          fallback={<p class="text-xs text-muted py-1">No configurable options for this theme.</p>}
        >
          <div class="space-y-4">
            <For each={[...new Set(opts()!.fields.map((f) => f.group))]}>
              {(group) => (
                <div class="space-y-2">
                  <p class="text-xs font-semibold text-muted uppercase tracking-wider">{group}</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <For each={opts()!.fields.filter((f) => f.group === group)}>
                      {(field) => (
                        <OptionField
                          field={field}
                          value={values()[field.key] ?? field.value ?? ""}
                          onChange={(v) => setValue(field.key, v)}
                        />
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>

            <div class="flex items-center gap-2 pt-1">
              <button
                onClick={onSave}
                disabled={saving()}
                class="px-3 py-1.5 text-xs rounded-lg bg-accent text-accent-fg
                       hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {saving() ? "Saving…" : "Save options"}
              </button>
              <Show when={saved()}>
                <span class="text-xs text-green-600 dark:text-green-400">Saved</span>
              </Show>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}

function OptionField(props: {
  field: ThemeField;
  value: string;
  onChange: (v: string) => void;
}) {
  const f = props.field;

  const hint = () => f.hint ? (
    <p class="text-xs text-muted mt-0.5">{f.hint}</p>
  ) : null;

  if (f.type === "bool") {
    return (
      <label class="flex items-start gap-2 cursor-pointer select-none col-span-full sm:col-span-1">
        <input
          type="checkbox"
          checked={props.value === "1"}
          onChange={(e) => props.onChange(e.currentTarget.checked ? "1" : "0")}
          class="rounded border-rim w-4 h-4 mt-0.5 shrink-0 accent-[var(--color-accent)]"
        />
        <div>
          <span class="text-sm text-txt">{f.label}</span>
          {hint()}
        </div>
      </label>
    );
  }

  if (f.type === "select") {
    return (
      <div class="space-y-1">
        <label class="text-xs text-muted">{f.label}</label>
        <select
          value={props.value}
          onChange={(e) => props.onChange(e.currentTarget.value)}
          class="w-full px-2 py-1 text-sm rounded border border-rim bg-surface text-txt
                 focus:outline-none focus:border-accent"
        >
          <For each={Object.entries(f.options ?? {})}>
            {([optVal, optLabel]) => (
              <option value={optVal} selected={props.value === optVal}>{optLabel}</option>
            )}
          </For>
        </select>
        {hint()}
      </div>
    );
  }

  if (f.type === "color") {
    return (
      <div class="space-y-1">
        <label class="text-xs text-muted">{f.label}</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            value={props.value || "#000000"}
            onInput={(e) => props.onChange(e.currentTarget.value)}
            class="w-8 h-8 rounded border border-rim cursor-pointer bg-transparent p-0.5 shrink-0"
          />
          <input
            type="text"
            value={props.value}
            placeholder="empty = default"
            onInput={(e) => props.onChange(e.currentTarget.value)}
            class="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-rim bg-surface text-txt
                   placeholder:text-muted focus:outline-none focus:border-accent font-mono"
          />
        </div>
        {hint()}
      </div>
    );
  }

  return (
    <div class="space-y-1">
      <label class="text-xs text-muted">{f.label}</label>
      <input
        type="text"
        value={props.value}
        placeholder="empty = default"
        onInput={(e) => props.onChange(e.currentTarget.value)}
        class="w-full px-2 py-1 text-sm rounded border border-rim bg-surface text-txt
               placeholder:text-muted focus:outline-none focus:border-accent"
      />
      {hint()}
    </div>
  );
}

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      {Array.from({ length: 4 }, () => (
        <div class="h-16 rounded-lg border border-rim bg-elevated/30" />
      ))}
    </div>
  );
}
