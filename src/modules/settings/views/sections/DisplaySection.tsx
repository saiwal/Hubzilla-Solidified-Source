import { Show, For, createEffect, createSignal } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchDisplaySettings, saveDisplaySettings } from "../../api/api";
import { useSectionForm } from "../../store/useSectionForm";
import { applyTypography, type FontSize, type FontFamily } from "@/shared/lib/typography";
import { useThreadMode, setThreadMode } from "@/shared/store/thread-mode";
import { useListBehavior, setListBehavior, type ListBehavior } from "@/shared/store/list-behavior";
import { useScrollStyle, setScrollStyle, type ScrollStyle } from "@/shared/store/scroll-style";
import { applyCornerRadius, type CornerRadius } from "@/shared/lib/corner-radius";
import { useBgUrl, useBgFit, setBgUrl, setBgFit } from "@/shared/lib/background";
import { setEmojiAsImages } from "@/shared/store/emoji-as-images";
import PATTERN_PRESETS from "virtual:public-listing/patterns";
import BG_PRESETS from "virtual:public-listing/bg";
import { initTheme, useTheme } from "@/shared/lib/useTheme";
import { THEMES, type ThemeId } from "@/shared/types/theme.types";
import { useI18n } from "@/i18n";
import { MdFillCheck } from "solid-icons/md";

export default function DisplaySection() {
  const { t } = useI18n();
  const threadMode = useThreadMode();
  const listBehavior = useListBehavior();
  const scrollStyle = useScrollStyle();
  const { customColors, updateCustomColors } = useTheme();

  const [previewSize, setPreviewSize] = createSignal<FontSize>("medium");
  const [previewFamily, setPreviewFamily] = createSignal<FontFamily>("system");
  const [previewScheme, setPreviewScheme] = createSignal<ThemeId>("light");
  const [cornerRadius, setCornerRadius] = createSignal<CornerRadius>(
    (localStorage.getItem("hz-corner-radius") as CornerRadius) ?? "default"
  );

  const { data, saving, handleSubmit } = useSectionForm({
    section: "display",
    fetcher: fetchDisplaySettings,
    saver: saveDisplaySettings,
    numericFields: [
      "update_interval", "itemspage",
      "start_menu", "show_emoji_images",
    ],
    checkboxFields: ["start_menu", "show_emoji_images"],
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
    if (d.scroll_style) setScrollStyle(d.scroll_style as ScrollStyle);
    if (d.corner_radius) {
      setCornerRadius(d.corner_radius as CornerRadius);
      applyCornerRadius(d.corner_radius as CornerRadius);
    }
    setEmojiAsImages(!!d.show_emoji_images);
  });

  return (
    <SubPageContent title={t("settings.title_display")} description={t("settings.desc_display")}>
      <Show when={data()} fallback={<FormSkeleton />}>
        <form onSubmit={handleSubmit} class="space-y-6">

          {/* Hubzilla theme */}
          <Show when={data()!.themes.length > 0}>
            <Field label={t("settings.theme")} hint={t("settings.theme_hint")}>
              <select
                name="theme"
                class="w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                       hover:border-rim-strong focus:outline-none focus:border-rim-strong
                       transition-colors text-sm"
              >
                <For each={data()!.themes}>
                  {(th) => (
                    <option value={th} selected={th === data()!.theme}>
                      {th}
                    </option>
                  )}
                </For>
              </select>
            </Field>
          </Show>

          {/* SPA color scheme */}
          <Field label={t("settings.color_scheme")}>
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
                {(th) => (
                  <option value={th.id} selected={th.id === previewScheme()}>
                    {th.label}
                  </option>
                )}
              </For>
            </select>
          </Field>

          {/* Custom theme color editor */}
          <Show when={previewScheme() === "custom"}>
            <div class="rounded-xl border border-rim bg-elevated p-4 space-y-4">
              <p class="text-sm font-medium text-txt">{t("settings.custom_theme_colors")}</p>
              <p class="text-xs text-muted -mt-2">
                {t("settings.custom_theme_hint")}
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <ColorSwatch
                  label={t("settings.color_bg")}
                  hint={t("settings.color_bg_hint")}
                  value={customColors().base}
                  onChange={(v) => updateCustomColors({ ...customColors(), base: v })}
                />
                <ColorSwatch
                  label={t("settings.color_txt")}
                  hint={t("settings.color_txt_hint")}
                  value={customColors().txt}
                  onChange={(v) => updateCustomColors({ ...customColors(), txt: v })}
                />
                <ColorSwatch
                  label={t("settings.color_accent")}
                  hint={t("settings.color_accent_hint")}
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
                <span class="text-sm text-txt">{t("settings.dark_mode")}</span>
              </label>

              <div class="pt-1 border-t border-rim">
                <p class="text-xs text-muted">
                  {t("settings.custom_theme_derived")}
                </p>
              </div>
            </div>
          </Show>

          {/* Items per page */}
          <Field
            label={t("settings.items_per_page")}
            hint={t("settings.items_per_page_hint")}
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
            label={t("settings.stream_refresh")}
            hint={t("settings.stream_refresh_hint")}
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
          <Field label={t("settings.font_size")}>
            <div class="flex gap-3">
              <For each={[
                { value: "small",  labelKey: "settings.font_size_small"  },
                { value: "medium", labelKey: "settings.font_size_medium" },
                { value: "large",  labelKey: "settings.font_size_large"  },
                { value: "xl",     labelKey: "settings.font_size_xl"     },
              ] as const}>
                {(size) => (
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="font_size"
                      value={size.value}
                      checked={previewSize() === size.value}
                      onChange={() => {
                        setPreviewSize(size.value as FontSize);
                        applyTypography(size.value, previewFamily());
                      }}
                      class="accent-accent cursor-pointer"
                    />
                    <span class="text-sm text-txt">{t(size.labelKey)}</span>
                  </label>
                )}
              </For>
            </div>
          </Field>

          <Field label={t("settings.font_family")}>
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
              <optgroup label={t("settings.font_group_standard")}>
                <option value="system"    selected={previewFamily() === "system"}>System (default)</option>
                <option value="serif"     selected={previewFamily() === "serif"}>Serif — Georgia</option>
                <option value="monospace" selected={previewFamily() === "monospace"}>Monospace</option>
              </optgroup>
              <optgroup label={t("settings.font_group_clean")}>
                <option value="nunito"       selected={previewFamily() === "nunito"}>Nunito — rounded, approachable</option>
                <option value="saira"        selected={previewFamily() === "saira"}>Saira — condensed, versatile</option>
                <option value="share-tech"   selected={previewFamily() === "share-tech"}>Share Tech — sharp geometric</option>
              </optgroup>
              <optgroup label={t("settings.font_group_editorial")}>
                <option value="playfair"          selected={previewFamily() === "playfair"}>Playfair Display — elegant serif</option>
                <option value="libre-baskerville" selected={previewFamily() === "libre-baskerville"}>Libre Baskerville — classic bookface</option>
              </optgroup>
              <optgroup label={t("settings.font_group_retro")}>
                <option value="space-mono" selected={previewFamily() === "space-mono"}>Space Mono — terminal vibes</option>
                <option value="iosevka"    selected={previewFamily() === "iosevka"}>Iosevka — programmer's mono</option>
                <option value="righteous"  selected={previewFamily() === "righteous"}>Righteous — bold &amp; retro</option>
              </optgroup>
              <optgroup label={t("settings.font_group_rounded")}>
                <option value="comfortaa" selected={previewFamily() === "comfortaa"}>Comfortaa — rounded geometric</option>
              </optgroup>
              <optgroup label={t("settings.font_group_display")}>
                <option value="playwrite-england" selected={previewFamily() === "playwrite-england"}>Playwrite England Joined — handwritten</option>
              </optgroup>
              <optgroup label={t("settings.font_group_fun")}>
                <option value="comic"     selected={previewFamily() === "comic"}>Comic Neue — the friendly classic</option>
              </optgroup>
              <optgroup label={t("settings.font_group_accessibility")}>
                <option value="opendyslexic" selected={previewFamily() === "opendyslexic"}>OpenDyslexic — easier to read</option>
              </optgroup>
            </select>
          </Field>


          {/* Corner roundness */}
          <Field label={t("settings.corner_radius")} hint={t("settings.corner_radius_hint")}>
            <input type="hidden" name="corner_radius" value={cornerRadius()} />
            <div class="flex gap-2 flex-wrap">
              <For each={[
                { value: "none",    labelKey: "settings.corner_radius_none"    },
                { value: "sm",      labelKey: "settings.corner_radius_sm"      },
                { value: "default", labelKey: "settings.corner_radius_default" },
                { value: "lg",      labelKey: "settings.corner_radius_lg"      },
                { value: "xl",      labelKey: "settings.corner_radius_xl"      },
              ] as const}>
                {(opt) => {
                  const previewRadius: Record<string, string> = {
                    none: "0px", sm: "4px", default: "8px", lg: "12px", xl: "18px",
                  };
                  const selected = () => cornerRadius() === opt.value;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setCornerRadius(opt.value as CornerRadius);
                        applyCornerRadius(opt.value as CornerRadius);
                      }}
                      class={`flex flex-col items-center gap-1.5 px-3 py-2 border rounded-lg
                        transition-colors cursor-pointer text-xs
                        ${selected()
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-rim bg-surface text-muted hover:border-rim-strong hover:text-txt"
                        }`}
                    >
                      <span
                        class="w-8 h-8 border-2 bg-elevated shrink-0"
                        style={{
                          "border-color": selected() ? "var(--color-accent)" : "var(--color-rim-strong)",
                          "border-radius": previewRadius[opt.value],
                        }}
                      />
                      <span>{t(opt.labelKey)}</span>
                    </button>
                  );
                }}
              </For>
            </div>
          </Field>

          {/* List view behavior */}
          <Field label={t("settings.list_view_behavior")} hint={t("settings.list_view_behavior_hint")}>
            <div class="flex gap-4">
              {(["list", "inbox"] as const).map((mode) => (
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="list_behavior"
                    value={mode}
                    checked={listBehavior() === mode}
                    onChange={() => setListBehavior(mode as ListBehavior)}
                    class="accent-accent cursor-pointer"
                  />
                  <span class="text-sm text-txt">
                    {mode === "list" ? t("settings.list_view_behavior_list") : t("settings.list_view_behavior_inbox")}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {/* Comment view mode */}
          <Field label={t("settings.comment_view")} hint={t("settings.comment_view_hint")}>
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

          {/* Scroll style */}
          <Field label={t("settings.scroll_style")} hint={t("settings.scroll_style_hint")}>
            <div class="flex gap-4">
              {(["endless", "load_more"] as const).map((mode) => (
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scroll_style"
                    value={mode}
                    checked={scrollStyle() === mode}
                    onChange={() => setScrollStyle(mode)}
                    class="accent-accent cursor-pointer"
                  />
                  <span class="text-sm text-txt">
                    {mode === "endless" ? t("settings.scroll_style_endless") : t("settings.scroll_style_load_more")}
                  </span>
                </label>
              ))}
            </div>
          </Field>

          {/* Show emoji as images */}
          <div>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="show_emoji_images"
                value="1"
                checked={!!data()!.show_emoji_images}
                class="h-4 w-4 rounded border-rim accent-accent"
              />
              <span class="text-sm text-txt">{t("settings.show_emoji_images")}</span>
            </label>
            <p class="text-xs text-muted mt-1 ml-7">{t("settings.show_emoji_images_hint")}</p>
          </div>

          {/* Background picker */}
          <BackgroundPicker />

          {/* Feedback + submit */}
          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving()}
              class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-opacity"
            >
              {saving() ? t("settings.saving") : t("settings.save")}
            </button>

          </div>

        </form>
      </Show>
    </SubPageContent>
  );
}

// ── Background picker ─────────────────────────────────────────────────────────

type BgKind = "pattern" | "background";

const _BASE = import.meta.env.BASE_URL;
const PATTERN_FOLDER = `${_BASE}patterns/`;
const BG_FOLDER = `${_BASE}bg/`;


function BackgroundPicker() {
  const { t } = useI18n();
  const bgUrl = useBgUrl();
  const bgFit = useBgFit();

  const [kind, setKind] = createSignal<BgKind>(
    bgUrl().startsWith(PATTERN_FOLDER) || bgFit() === "tile" ? "pattern" : "background"
  );
  const [customUrlVal, setCustomUrlVal] = createSignal(
    bgUrl() && !bgUrl().startsWith(PATTERN_FOLDER) && !bgUrl().startsWith(BG_FOLDER) ? bgUrl() : ""
  );

  createEffect(() => {
    const url = bgUrl();
    if (url.startsWith(PATTERN_FOLDER)) setKind("pattern");
    else if (url.startsWith(BG_FOLDER)) setKind("background");
    else if (url) setCustomUrlVal(url);
    else setCustomUrlVal("");
  });

  const presets = () => kind() === "pattern" ? PATTERN_PRESETS : BG_PRESETS;
  const folder = () => kind() === "pattern" ? PATTERN_FOLDER : BG_FOLDER;

  function switchKind(k: BgKind) {
    setKind(k);
    setBgFit(k === "pattern" ? "tile" : "cover");
    const url = bgUrl();
    if ((k === "pattern" && url.startsWith(BG_FOLDER)) || (k === "background" && url.startsWith(PATTERN_FOLDER))) {
      setBgUrl("");
    }
  }

  function selectPreset(name: string) {
    setBgUrl(folder() + name);
    setBgFit(kind() === "pattern" ? "tile" : "cover");
    setCustomUrlVal("");
  }

  function applyCustomUrl(url: string) {
    const trimmed = url.trim();
    setBgUrl(trimmed);
    if (!trimmed) setCustomUrlVal("");
  }

  return (
    <Field label={t("settings.bg_image_url")} hint={t("settings.bg_image_url_hint")}>
      <input type="hidden" name="bg_url" value={bgUrl()} />
      <input type="hidden" name="bg_fit" value={bgFit()} />
      <div class="space-y-3">
        {/* Tabs */}
        <div class="flex gap-1 p-1 bg-elevated rounded-lg w-fit">
          {(["background", "pattern"] as BgKind[]).map((k) => (
            <button
              type="button"
              onClick={() => switchKind(k)}
              class={`px-3 py-1.5 text-sm rounded-md transition-colors
                ${kind() === k ? "bg-accent text-accent-fg" : "text-muted hover:text-txt"}`}
            >
              {k === "pattern" ? t("settings.bg_tab_pattern") : t("settings.bg_tab_background")}
            </button>
          ))}
        </div>

        {/* Preset grid */}
        <div class="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
          <For each={presets()}>
            {(name) => {
              const url = folder() + name;
              const selected = () => bgUrl() === url;
              const label = name.replace(/\.[^.]+$/, "").replace(/-/g, " ");
              return (
                <button
                  type="button"
                  onClick={() => selectPreset(name)}
                  title={label}
                  class={`relative aspect-square rounded-md overflow-hidden border-2 transition-all focus:outline-none
                    ${selected() ? "border-accent" : "border-rim hover:border-accent/60"}`}
                  style={{
                    "background-image": `url(${url})`,
                    "background-size": kind() === "pattern" ? "auto" : "cover",
                    "background-repeat": kind() === "pattern" ? "repeat" : "no-repeat",
                    "background-position": "center",
                  }}
                >
                  <Show when={selected()}>
                    <div class="absolute inset-0 bg-accent/20 flex items-center justify-center">
                      <div class="w-5 h-5 rounded-full bg-accent text-accent-fg flex items-center justify-center"><MdFillCheck class="w-3 h-3" /></div>
                    </div>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>

        {/* Custom URL */}
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted shrink-0">{t("settings.bg_custom_url")}</span>
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={customUrlVal()}
            onInput={(e) => setCustomUrlVal(e.currentTarget.value)}
            onBlur={(e) => applyCustomUrl(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && applyCustomUrl((e.currentTarget as HTMLInputElement).value)}
            class="flex-1 px-3 py-1.5 rounded-lg border border-rim bg-surface text-txt
                   hover:border-rim-strong focus:outline-none focus:border-rim-strong
                   transition-colors text-sm"
          />
        </div>

        {/* Clear */}
        <Show when={bgUrl()}>
          <button
            type="button"
            onClick={() => { setBgUrl(""); setCustomUrlVal(""); }}
            class="text-xs px-3 py-1.5 rounded-lg border border-rim bg-surface text-muted
                   hover:text-txt hover:border-rim-strong transition-colors"
          >
            {t("settings.bg_clear")}
          </button>
        </Show>
      </div>
    </Field>
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
    <div class="space-y-2">
      <label class="block text-xs font-medium text-txt">{props.label}</label>
      <div class="flex items-center gap-3">
        <input
          type="color"
          value={props.value}
          onInput={(e) => props.onChange(e.currentTarget.value)}
          class="w-9 h-9 shrink-0 aspect-square rounded-lg border border-rim bg-surface cursor-pointer p-0.5"
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
          class="w-24 px-2 py-1.5 rounded-lg border border-rim bg-surface text-txt text-xs
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
