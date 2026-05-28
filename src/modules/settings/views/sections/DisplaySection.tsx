import { Show, For, createEffect, createSignal } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchDisplaySettings, saveDisplaySettings } from "../../api/api";
import { useSectionForm } from "../../store/useSectionForm";
import { applyTypography, type FontSize, type FontFamily } from "@/shared/lib/typography";
import { useThreadMode, setThreadMode } from "@/shared/store/thread-mode";
import { useBgUrl, useBgFit, setBgUrl, setBgFit, type BgFit } from "@/shared/lib/background";
import { initTheme, useTheme } from "@/shared/lib/useTheme";
import { THEMES, type ThemeId } from "@/shared/types/theme.types";

export default function DisplaySection() {
  const threadMode = useThreadMode();
  const bgUrl = useBgUrl();
  const bgFit = useBgFit();
  const { customColors, updateCustomColors } = useTheme();

  const [previewSize, setPreviewSize] = createSignal<FontSize>("medium");
  const [previewFamily, setPreviewFamily] = createSignal<FontFamily>("system");
  const [previewScheme, setPreviewScheme] = createSignal<ThemeId>("light");

  function commitUrl(e: Event) {
    const val = (e.currentTarget as HTMLInputElement).value.trim();
    setBgUrl(val);
  }
  const { data, saving, saveError, saveOk, handleSubmit } = useSectionForm({
    fetcher: fetchDisplaySettings,
    saver: saveDisplaySettings,
    numericFields: [
      "update_interval", "itemspage",
      "start_menu",
    ],
    checkboxFields: ["start_menu"],
    reloadOn: (prev, next) => prev?.theme !== next.theme,
  });

  createEffect(() => {
    const d = data();
    if (!d) return;
    setPreviewSize(d.font_size as FontSize);
    setPreviewFamily(d.font_family as FontFamily);
    applyTypography(d.font_size, d.font_family);
    setBgUrl(d.bg_url ?? "");
    setBgFit(d.bg_fit ?? "cover");
    if (d.color_scheme) {
      setPreviewScheme(d.color_scheme as ThemeId);
      initTheme(d.color_scheme as ThemeId, d.custom_theme_colors);
    }
  });

  return (
    <SubPageContent title="Display" description="Appearance and theme preferences.">
      <Show when={data()} fallback={<FormSkeleton />}>
        <form onSubmit={handleSubmit} class="space-y-6">

          {/* Hubzilla theme */}
          <Show when={data()!.themes.length > 0}>
            <Field label="Theme" hint="The Hubzilla server-side theme. Requires a page reload to apply.">
              <select
                name="theme"
                class="w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                       hover:border-rim-strong focus:outline-none focus:border-rim-strong
                       transition-colors text-sm"
              >
                <For each={data()!.themes}>
                  {(t) => (
                    <option value={t} selected={t === data()!.theme}>
                      {t}
                    </option>
                  )}
                </For>
              </select>
            </Field>
          </Show>

          {/* SPA color scheme */}
          <Field label="Color scheme">
            <select
              name="color_scheme"
              class="w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                     hover:border-rim-strong focus:outline-none focus:border-rim-strong
                     transition-colors text-sm"
              onChange={(e) => {
                const scheme = e.currentTarget.value as ThemeId;
                setPreviewScheme(scheme);
                initTheme(scheme);
              }}
            >
              <For each={[...THEMES].sort((a, b) => a.label.localeCompare(b.label))}>
                {(t) => (
                  <option value={t.id} selected={t.id === previewScheme()}>
                    {t.label}
                  </option>
                )}
              </For>
            </select>
          </Field>

          {/* Custom theme color editor */}
          <Show when={previewScheme() === "custom"}>
            <div class="rounded-xl border border-rim bg-elevated p-4 space-y-4">
              <p class="text-sm font-medium text-txt">Custom theme colors</p>
              <p class="text-xs text-muted -mt-2">
                Changes apply immediately and are saved to your account.
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorSwatch
                  label="Background"
                  hint="Main page background"
                  value={customColors().base}
                  onChange={(v) => updateCustomColors({ ...customColors(), base: v })}
                />
                <ColorSwatch
                  label="Text"
                  hint="Primary text color"
                  value={customColors().txt}
                  onChange={(v) => updateCustomColors({ ...customColors(), txt: v })}
                />
                <ColorSwatch
                  label="Accent"
                  hint="Buttons, links, highlights"
                  value={customColors().accent}
                  onChange={(v) => updateCustomColors({ ...customColors(), accent: v })}
                />
              </div>

              <label class="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={customColors().isDark}
                  onChange={(e) =>
                    updateCustomColors({ ...customColors(), isDark: e.currentTarget.checked })
                  }
                  class="accent-accent cursor-pointer"
                />
                <span class="text-sm text-txt">Dark mode</span>
              </label>

              <div class="pt-1 border-t border-rim">
                <p class="text-xs text-muted">
                  Surface, border, and muted colors are automatically derived from your background and text choices.
                </p>
              </div>
            </div>
          </Show>

          {/* Items per page */}
          <Field
            label="Items per page"
            hint="How many posts to load at once (1–30)."
          >
            <input
              type="number"
              name="itemspage"
              min="1"
              max="30"
              value={data()!.itemspage}
              class="w-24 px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                     hover:border-rim-strong focus:outline-none focus:border-rim-strong
                     transition-colors text-sm"
            />
          </Field>

          {/* Update interval */}
          <Field
            label="Stream refresh interval (seconds)"
            hint="How often the network stream checks for new posts."
          >
            <input
              type="number"
              name="update_interval"
              min="10"
              max="3600"
              value={data()!.update_interval}
              class="w-24 px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                     hover:border-rim-strong focus:outline-none focus:border-rim-strong
                     transition-colors text-sm"
            />
          </Field>

          {/* Typography */}
          <Field label="Font size">
            <div class="flex gap-3">
              <For each={["small", "medium", "large"] as const}>
                {(size) => (
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="font_size"
                      value={size}
                      checked={previewSize() === size}
                      onChange={() => {
                        setPreviewSize(size);
                        applyTypography(size, previewFamily());
                      }}
                      class="accent-accent cursor-pointer"
                    />
                    <span class="text-sm text-txt capitalize">{size}</span>
                  </label>
                )}
              </For>
            </div>
          </Field>

          <Field label="Font family">
            <select
              name="font_family"
              class="w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                     hover:border-rim-strong focus:outline-none focus:border-rim-strong
                     transition-colors text-sm"
              onChange={(e) => {
                const fam = e.currentTarget.value as FontFamily;
                setPreviewFamily(fam);
                applyTypography(previewSize(), fam);
              }}
            >
              <optgroup label="Standard">
                <option value="system"    selected={previewFamily() === "system"}>System (default)</option>
                <option value="serif"     selected={previewFamily() === "serif"}>Serif — Georgia</option>
                <option value="monospace" selected={previewFamily() === "monospace"}>Monospace</option>
              </optgroup>
              <optgroup label="Clean &amp; Friendly">
                <option value="nunito"    selected={previewFamily() === "nunito"}>Nunito — rounded, approachable</option>
              </optgroup>
              <optgroup label="Editorial">
                <option value="playfair"  selected={previewFamily() === "playfair"}>Playfair Display — elegant serif</option>
              </optgroup>
              <optgroup label="Retro &amp; Techy">
                <option value="space-mono" selected={previewFamily() === "space-mono"}>Space Mono — terminal vibes</option>
                <option value="righteous"  selected={previewFamily() === "righteous"}>Righteous — bold &amp; retro</option>
              </optgroup>
              <optgroup label="Rounded &amp; Playful">
                <option value="comfortaa" selected={previewFamily() === "comfortaa"}>Comfortaa — rounded geometric</option>
                <option value="pacifico"  selected={previewFamily() === "pacifico"}>Pacifico — friendly display</option>
              </optgroup>
              <optgroup label="Just for Fun">
                <option value="comic"     selected={previewFamily() === "comic"}>Comic Neue — the friendly classic</option>
              </optgroup>
              <optgroup label="Accessibility">
                <option value="opendyslexic" selected={previewFamily() === "opendyslexic"}>OpenDyslexic — easier to read</option>
              </optgroup>
            </select>
          </Field>


          {/* Comment view mode */}
          <Field label="Comment view" hint="How replies are displayed under posts. Takes effect immediately.">
            <div class="flex gap-4">
              {(["threaded", "flat"] as const).map((mode) => (
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="thread_mode"
                    value={mode}
                    checked={threadMode() === (mode === "threaded")}
                    onChange={() => setThreadMode(mode === "threaded")}
                    class="accent-accent cursor-pointer"
                  />
                  <span class="text-sm text-txt capitalize">{mode}</span>
                </label>
              ))}
            </div>
          </Field>

          {/* Background image */}
          <Field label="Background image URL" hint="Paste a URL to use as the page background. Saved with your other display settings.">
            <div class="space-y-2">
              <div class="flex gap-2">
                <input
                  type="url"
                  name="bg_url"
                  placeholder="https://example.com/image.jpg"
                  value={bgUrl()}
                  onBlur={commitUrl}
                  onKeyDown={(e) => e.key === "Enter" && commitUrl(e)}
                  class="flex-1 px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                         hover:border-rim-strong focus:outline-none focus:border-rim-strong
                         transition-colors text-sm"
                />
                <Show when={bgUrl()}>
                  <button
                    type="button"
                    onClick={() => setBgUrl("")}
                    class="px-3 py-2 text-sm rounded-lg border border-rim bg-surface text-muted
                           hover:text-txt hover:border-rim-strong transition-colors"
                  >
                    Clear
                  </button>
                </Show>
              </div>
              <div class="flex gap-4">
                {(["cover", "tile"] as BgFit[]).map((fit) => (
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="bg_fit"
                      value={fit}
                      checked={bgFit() === fit}
                      onChange={() => setBgFit(fit)}
                      class="accent-accent cursor-pointer"
                    />
                    <span class="text-sm text-txt capitalize">{fit}</span>
                  </label>
                ))}
              </div>
            </div>
          </Field>

          {/* Feedback + submit */}
          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving()}
              class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-opacity"
            >
              {saving() ? "Saving…" : "Save changes"}
            </button>

            <Show when={saveOk()}>
              <span class="text-sm text-green-600">Saved ✓</span>
            </Show>
            <Show when={saveError()}>
              <span class="text-sm text-red-500">{saveError()}</span>
            </Show>
          </div>

        </form>
      </Show>
    </SubPageContent>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field(props: {
  label: string;
  hint?: string;
  children: any;
}) {
  return (
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-txt">{props.label}</label>
      {props.children}
      <Show when={props.hint}>
        <p class="text-xs text-muted">{props.hint}</p>
      </Show>
    </div>
  );
}

function ColorSwatch(props: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div class="space-y-1">
      <label class="block text-xs font-medium text-txt">{props.label}</label>
      <div class="flex items-center gap-2">
        <input
          type="color"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          class="w-9 h-9 rounded-lg border border-rim bg-surface cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={props.value}
          onBlur={(e) => {
            const v = e.currentTarget.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) props.onChange(v);
            else e.currentTarget.value = props.value;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = e.currentTarget.value.trim();
              if (/^#[0-9a-fA-F]{6}$/.test(v)) props.onChange(v);
              else e.currentTarget.value = props.value;
            }
          }}
          maxLength={7}
          class="flex-1 px-2 py-1.5 rounded-lg border border-rim bg-surface text-txt text-xs
                 font-mono hover:border-rim-strong focus:outline-none focus:border-rim-strong
                 transition-colors"
        />
      </div>
      <p class="text-xs text-muted">{props.hint}</p>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div class="space-y-5 animate-pulse">
      {[...Array(4)].map(() => (
        <div class="space-y-2">
          <div class="h-3.5 w-32 rounded bg-elevated" />
          <div class="h-9 w-full max-w-xs rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}
