import { createResource, createSignal, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminFeatures, saveAdminFeatures } from "../../api/api";
import type { FeatureItem } from "../../api/types";

export default function FeaturesSection() {
  const [features, { refetch }] = createResource(fetchAdminFeatures);
  const [saving, setSaving] = createSignal(false);
  const [saveOk, setSaveOk] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const raw = new FormData(form);
    const payload: Record<string, boolean> = {};

    features()?.sections.forEach((s) =>
      s.items.forEach((item) => {
        payload[item.id] = raw.has(item.id);
      })
    );

    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      await saveAdminFeatures(payload);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
      refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SubPageContent
      title="Features"
      description="Enable or disable optional site features."
      action={
        <Show when={features()}>
          <button
            form="features-form"
            type="submit"
            disabled={saving()}
            class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-txt
                   hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {saving() ? "Saving…" : "Save"}
          </button>
        </Show>
      }
    >
      <Show when={features()} fallback={<Skeleton />}>
        {(f) => (
          <form id="features-form" onSubmit={handleSubmit} class="space-y-6">
            <For each={f().sections}>
              {(section) => (
                <div class="space-y-3">
                  <h3 class="text-sm font-semibold text-txt">{section.label}</h3>
                  <div class="space-y-2">
                    <For each={section.items}>{(item) => <FeatureRow item={item} />}</For>
                  </div>
                </div>
              )}
            </For>

            <div class="flex items-center gap-3 pt-1">
              <Show when={saveOk()}>
                <span class="text-sm text-green-600">Saved ✓</span>
              </Show>
              <Show when={saveError()}>
                <span class="text-sm text-red-500">{saveError()}</span>
              </Show>
            </div>
          </form>
        )}
      </Show>
    </SubPageContent>
  );
}

function FeatureRow(props: { item: FeatureItem }) {
  return (
    <label class={`flex items-start gap-3 p-3 rounded-lg border border-rim hover:bg-elevated/50 transition-colors ${props.item.locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        name={props.item.id}
        checked={props.item.enabled}
        disabled={props.item.locked}
        class="mt-0.5 rounded accent-[var(--color-accent)]"
      />
      <div class="space-y-0.5">
        <p class="text-sm font-medium text-txt">{props.item.label}</p>
        <p class="text-xs text-muted">{props.item.desc}</p>
        <Show when={props.item.locked}>
          <p class="text-xs text-accent">Locked by admin</p>
        </Show>
      </div>
    </label>
  );
}

function Skeleton() {
  return (
    <div class="space-y-3 animate-pulse">
      {Array.from({ length: 5 }, () => (
        <div class="h-14 rounded-lg border border-rim bg-elevated/30" />
      ))}
    </div>
  );
}
