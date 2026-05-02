import { Show, createSignal } from "solid-js";
import { createResource } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";

interface DangerData { nick: string; name: string; account_email: string; }

export default function DangerSection() {
  const [data] = createResource<DangerData>(async () => {
    const res = await apiFetch("/api/settings/danger");
    const { data } = await res.json();
    return data;
  });

  const [confirm, setConfirm] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const removeChannel = async () => {
    if (confirm() !== data()?.nick) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/settings/danger", {
        method: "POST",
        body: JSON.stringify({ action: "remove_channel" }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      window.location.href = json.data?.redirect ?? "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  };

  return (
    <SubPageContent title="Danger zone" description="Irreversible actions. Proceed with care.">
      <Show when={data()}>
        <div class="space-y-6">

          {/* Remove channel */}
          <div class="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-900/10 p-5 space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-red-700">Remove this channel</h3>
              <p class="text-xs text-red-600 mt-1">
                Permanently deletes <strong>{data()!.name}</strong> (@{data()!.nick}) and all
                its posts, connections, and data. This cannot be undone.
              </p>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-medium text-red-700">
                Type <strong>{data()!.nick}</strong> to confirm
              </label>
              <input
                type="text"
                value={confirm()}
                onInput={(e) => setConfirm(e.currentTarget.value)}
                placeholder={data()!.nick}
                class="w-full max-w-xs px-3 py-2 rounded-lg border border-red-300 bg-white
                       text-txt text-sm outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <Show when={error()}>
              <p class="text-xs text-red-600">{error()}</p>
            </Show>

            <button
              type="button"
              disabled={confirm() !== data()!.nick || busy()}
              onClick={removeChannel}
              class="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white
                     hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
            >
              {busy() ? "Removing…" : "Remove channel permanently"}
            </button>
          </div>

        </div>
      </Show>
    </SubPageContent>
  );
}
