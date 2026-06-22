import { onCleanup, onMount } from "solid-js";
import FilerobotImageEditor from "filerobot-image-editor";
import { TABS, TOOLS } from "react-filerobot-image-editor";

// input.utils.js in @scaleflex/ui hardcodes lightPalette for input bg/text/border,
// completely bypassing the theme object. Inject CSS overrides using the stable
// Sfx* class names that generateClassNames() always produces.
function injectInputOverrides(): HTMLStyleElement {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();

  const bg     = v("--color-elevated");
  const bgFocus = v("--color-surface");
  const txt    = v("--color-txt");
  const subtle = v("--color-subtle");
  const rim    = v("--color-rim");
  const accent = v("--color-accent");

  const style = document.createElement("style");
  style.textContent = `
    .SfxInput-root {
      background-color: ${bg} !important;
      color: ${txt} !important;
      border-color: ${rim} !important;
    }
    .SfxInput-root:hover {
      background-color: ${bg} !important;
      color: ${txt} !important;
      border-color: ${rim} !important;
    }
    .SfxInput-root:focus-within {
      background-color: ${bgFocus} !important;
      color: ${txt} !important;
      border-color: ${accent} !important;
    }
    .SfxInput-Base {
      color: ${txt} !important;
    }
    .SfxInput-Base::placeholder {
      color: ${subtle} !important;
    }
  `;
  document.head.appendChild(style);
  return style;
}

function buildTheme() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();

  const surface   = v("--color-surface");
  const elevated  = v("--color-elevated");
  const base      = v("--color-base");
  const txt       = v("--color-txt");
  const muted     = v("--color-muted");
  const subtle    = v("--color-subtle");
  const rim       = v("--color-rim");
  const rimStrong = v("--color-rim-strong");
  const accent    = v("--color-accent");
  const accentFg  = v("--color-accent-fg");

  return {
    palette: {
      "txt-primary":            txt,
      "txt-secondary":          muted,
      "txt-secondary-invert":   surface,
      "txt-placeholder":        subtle,
      "accent-primary":         accent,
      "accent-primary-hover":   accent,
      "accent-primary-active":  accent,
      "accent-primary-disabled": muted,
      "accent-stateless":       accent,
      "bg-primary":             surface,
      "bg-primary-light":       elevated,
      "bg-primary-hover":       elevated,
      "bg-primary-active":      elevated,
      "bg-primary-stateless":   elevated,
      "bg-secondary":           elevated,
      "bg-grey":                elevated,
      "bg-base-light":          base,
      "bg-base-medium":         base,
      "bg-stateless":           elevated,
      "bg-hover":               elevated,
      "bg-active":              elevated,
      "bg-tooltip":             elevated,
      "icon-primary":           txt,
      "icons-secondary":        muted,
      "icons-placeholder":      subtle,
      "icons-muted":            subtle,
      "icons-invert":           surface,
      "icons-primary-hover":    txt,
      "icons-secondary-hover":  muted,
      "btn-primary-text":       accentFg,
      "btn-primary-text-0-6":   accentFg,
      "btn-primary-text-0-4":   accentFg,
      "btn-disabled-text":      subtle,
      "btn-secondary-text":     txt,
      "link-primary":           accent,
      "link-stateless":         accent,
      "link-hover":             accent,
      "link-active":            accent,
      "link-muted":             muted,
      "borders-primary":        rim,
      "borders-primary-hover":  rimStrong,
      "borders-secondary":      rim,
      "borders-strong":         rimStrong,
      "borders-button":         rim,
      "borders-item":           rim,
      "borders-base-light":     rim,
      "borders-base-medium":    rimStrong,
      "borders-disabled":       rim,
      "border-hover-bottom":    accent,
      "border-active-bottom":   accent,
    } as Record<string, string>,
  };
}

export interface ImageEditorProps {
  file: File;
  /** width / height ratio — omit for free crop */
  aspect?: number;
  /** hint for which preset to show in the Crop tool */
  circular?: boolean;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export default function ImageEditor(props: ImageEditorProps) {
  let container!: HTMLDivElement;
  let editor: InstanceType<typeof FilerobotImageEditor> | null = null;
  let objectUrl = "";
  let inputOverrideStyle: HTMLStyleElement | null = null;

  onMount(() => {
    objectUrl = URL.createObjectURL(props.file);
    inputOverrideStyle = injectInputOverrides();

    const cropConfig: Record<string, unknown> = { autoResize: false };
    if (props.aspect !== undefined) {
      const isCover = props.aspect > 1.5;
      cropConfig.ratio = props.aspect;
      cropConfig.noPresets = false;
      cropConfig.presetsItems = [{
        titleKey:       isCover ? "cover" : "square",
        descriptionKey: isCover ? `${props.aspect.toFixed(2)}:1` : "1:1",
        ratio:          props.aspect,
      }];
    }

    editor = new FilerobotImageEditor(container, {
      source: objectUrl,
      theme: buildTheme(),
      defaultSavedImageName: "",

      onSave: async (savedImageData) => {
        let blob: Blob | null = null;

        if (savedImageData.imageCanvas) {
          // Wrap callback in a Promise so onSave waits before resolving.
          // Without this, the async function resolves with undefined before
          // toBlob fires, which causes Filerobot to throw an unhandled rejection.
          blob = await new Promise<Blob | null>((resolve) => {
            savedImageData.imageCanvas!.toBlob(resolve, "image/jpeg", 0.92);
          });
        } else if (savedImageData.imageBase64) {
          blob = await fetch(savedImageData.imageBase64)
            .then((r) => r.blob())
            .catch(() => null);
        }

        if (!blob) return;

        const e = editor;
        editor = null;
        e?.terminate();
        props.onConfirm(blob);
      },

      onClose: () => {
        props.onCancel();
      },

      Crop: cropConfig,

      tabsIds:        [TABS.ADJUST, TABS.FILTERS, TABS.FINETUNE, TABS.ANNOTATE, TABS.RESIZE],
      defaultTabId:   TABS.ADJUST,
      defaultToolId:  TOOLS.CROP,

      savingPixelRatio:  4,
      previewPixelRatio: 2,
    });

    editor.render();
  });

  onCleanup(() => {
    editor?.terminate();
    editor = null;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    inputOverrideStyle?.remove();
    inputOverrideStyle = null;
  });

  // Filerobot renders its own full-screen UI inside this fixed container.
  return <div ref={container} style="position: fixed; inset: 0; z-index: 9999;" />;
}
