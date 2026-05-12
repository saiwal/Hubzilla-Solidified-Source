import { createSignal, createEffect, onMount } from "solid-js";

// qrcode is a tiny (~10 kB) lib; load it once via dynamic import from CDN.
// We use the UMD build on unpkg so it works without bundler config changes.
declare global {
  interface Window {
    QRCode: {
      toDataURL: (text: string, opts: object) => Promise<string>;
    };
  }
}

let qrLoaded = false;
async function ensureQR(): Promise<void> {
  if (qrLoaded || window.QRCode) { qrLoaded = true; return; }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js";
    s.onload = () => { qrLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function QRGenerator() {
  const [text, setText] = createSignal("https://hz-ddev.ddev.site");
  const [dataUrl, setDataUrl] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [size, setSize] = createSignal(200);

  const generate = async () => {
    const val = text().trim();
    if (!val) return;
    setError(null);
    try {
      await ensureQR();
      const url: string = await window.QRCode.toDataURL(val, {
        width: size(),
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setDataUrl(url);
    } catch (e) {
      setError("Could not generate QR code.");
    }
  };

  const download = () => {
    if (!dataUrl()) return;
    const a = document.createElement("a");
    a.href = dataUrl()!;
    a.download = "qrcode.png";
    a.click();
  };

  onMount(generate);
  createEffect(() => {
    // regenerate when size changes
    size();
    generate();
  });

  return (
    <div class="flex flex-col gap-5 items-center max-w-sm w-full mx-auto">
      <div class="w-full flex flex-col gap-2">
        <label class="text-sm text-muted">Text or URL</label>
        <textarea
          class="bg-surface border border-rim text-txt hover:border-rim-strong focus:outline-none rounded-xl px-4 py-3 resize-none text-sm w-full"
          rows={3}
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
          onBlur={generate}
          placeholder="Enter text or a URL…"
        />
      </div>

      <div class="w-full flex flex-col gap-2">
        <div class="flex justify-between text-sm">
          <span class="text-muted">Size</span>
          <span class="text-txt font-mono">{size()}px</span>
        </div>
        <input
          type="range"
          min={128}
          max={512}
          step={8}
          value={size()}
          class="w-full"
          onInput={(e) => setSize(Number(e.currentTarget.value))}
          onMouseUp={generate}
          onTouchEnd={generate}
        />
      </div>

      {error() && (
        <p class="text-sm text-red-500">{error()}</p>
      )}

      {dataUrl() && (
        <div class="flex flex-col items-center gap-4">
          <div class="bg-white p-3 rounded-xl border border-rim">
            <img src={dataUrl()!} alt="Generated QR code" class="block" style={{ width: `${Math.min(size(), 240)}px`, height: `${Math.min(size(), 240)}px` }} />
          </div>
          <button
            onClick={download}
            class="border border-rim text-muted hover:bg-elevated hover:text-txt rounded-xl px-5 py-2 text-sm transition-colors"
          >
            Download PNG
          </button>
        </div>
      )}
    </div>
  );
}
