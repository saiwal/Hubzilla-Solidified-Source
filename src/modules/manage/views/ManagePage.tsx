// modules/manage/views/ManagePage.tsx

import { type Component, For, Show, createSignal } from "solid-js";
import {
  useManageData,
  useActionState,
  doSwitchChannel,
  doSetDefault,
} from "../store";
import type { ManagedChannel, ManagedDelegate } from "../api";

// ── Sub-components ────────────────────────────────────────────────────────────

const ChannelCard: Component<{
  channel: ManagedChannel;
  onSwitch: (id: number) => void;
  onSetDefault: (id: number) => void;
  disabled: boolean;
}> = (props) => {
  const borderClass = () =>
    props.channel.is_current
      ? "border-blue-500 dark:border-blue-400"
      : "border-gray-200 dark:border-gray-700";

  return (
    <div
      class={`flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800 ${borderClass()}`}
    >
      {/* Avatar */}
      <div class="relative shrink-0">
        <img
          src={props.channel.photo}
          alt={props.channel.channel_name}
          class="w-10 h-10 rounded-full object-cover"
        />
        <Show when={props.channel.is_current}>
          <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800" />
        </Show>
      </div>

      {/* Info */}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-sm truncate">
            {props.channel.channel_name}
          </span>
          <Show when={props.channel.is_current}>
            <span class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              current
            </span>
          </Show>
          <Show when={props.channel.is_default}>
            <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              default
            </span>
          </Show>
          <Show when={props.channel.intros > 0}>
            <span class="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
              {props.channel.intros} new
            </span>
          </Show>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{props.channel.channel_address}
        </p>
      </div>

      {/* Actions */}
      <div class="flex items-center gap-1 shrink-0">
        <Show when={!props.channel.is_default}>
          <button
            onClick={() => props.onSetDefault(props.channel.channel_id)}
            disabled={props.disabled}
            title="Make default"
            class="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                   hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40
                   transition-colors text-xs"
          >
            ☆
          </button>
        </Show>
        <Show when={!props.channel.is_current}>
          <button
            onClick={() => props.onSwitch(props.channel.channel_id)}
            disabled={props.disabled}
            class="px-2.5 py-1 text-xs rounded-md font-medium
                   bg-blue-600 hover:bg-blue-700 text-white
                   disabled:opacity-40 transition-colors"
          >
            Switch
          </button>
        </Show>
      </div>
    </div>
  );
};

const DelegateCard: Component<{ delegate: ManagedDelegate }> = (props) => (
  <a
    href={props.delegate.switch_url}
    class="flex items-center gap-3 p-3 rounded-lg border border-gray-200
           dark:border-gray-700 bg-white dark:bg-gray-800
           hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
  >
    <img
      src={props.delegate.photo}
      alt={props.delegate.name}
      class="w-10 h-10 rounded-full object-cover shrink-0"
    />
    <div class="flex-1 min-w-0">
      <p class="font-medium text-sm truncate">{props.delegate.name}</p>
      <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
        {props.delegate.address}
      </p>
    </div>
    <span class="text-xs text-gray-400 shrink-0">delegate →</span>
  </a>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const ManagePage: Component = () => {
  const data = useManageData();
  const actionState = useActionState();
  const [confirmSwitch, setConfirmSwitch] = createSignal<number | null>(null);

  const isPending = () => actionState().status === "pending";
  const errorMsg = () => {
    const s = actionState();
    return s.status === "error" ? s.message : null;
  };
  const handleSwitch = (channelId: number) => {
    setConfirmSwitch(channelId);
  };

  const confirmSwitchAction = async () => {
    const id = confirmSwitch();
    if (!id) return;
    setConfirmSwitch(null);
    const redirectTo = await doSwitchChannel(id);
    if (redirectTo) {
      // Full page reload — session has changed on the server
      window.location.href = redirectTo;
    }
  };

  const handleSetDefault = async (channelId: number) => {
    await doSetDefault(channelId);
  };

  const channelToConfirm = () => {
    const id = confirmSwitch();
    if (!id) return null;
    return data()?.channels.find((c) => c.channel_id === id) ?? null;
  };

  const usageMessage = () => {
    const d = data();
    if (!d || d.limit === null) return null;
    return `${d.total_channels} of ${d.limit} channels used`;
  };

  return (
    <div class="max-w-lg mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-bold">Channels</h1>
        <a
          href={data()?.create_url ?? "/new_channel"}
          class="px-3 py-1.5 text-sm rounded-md font-medium
                 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
                 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          + New channel
        </a>
      </div>

      {/* Error banner */}
      <Show when={errorMsg()}>
        <div class="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {errorMsg()}
        </div>
      </Show>

      {/* Loading */}
      <Show when={data.loading}>
        <div class="space-y-3">
          <For each={[1, 2, 3]}>
            {() => (
              <div class="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            )}
          </For>
        </div>
      </Show>

      {/* Channel list */}
      <Show when={!data.loading && data()}>
        <div class="space-y-2">
          <For each={data()!.channels}>
            {(channel) => (
              <ChannelCard
                channel={channel}
                onSwitch={handleSwitch}
                onSetDefault={handleSetDefault}
                disabled={isPending()}
              />
            )}
          </For>
        </div>

        {/* Usage */}
        <Show when={usageMessage()}>
          <p class="text-xs text-gray-500 dark:text-gray-400 text-right">
            {usageMessage()}
          </p>
        </Show>

        {/* Delegates */}
        <Show when={(data()?.delegates.length ?? 0) > 0}>
          <div class="space-y-2">
            <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Delegated channels
            </h2>
            <For each={data()!.delegates}>
              {(delegate) => <DelegateCard delegate={delegate} />}
            </For>
          </div>
        </Show>
      </Show>

      {/* Switch confirmation modal */}
      <Show when={confirmSwitch() !== null}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 class="font-semibold text-lg">Switch channel?</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              You'll be switched to{" "}
              <strong>{channelToConfirm()?.channel_name}</strong>. The page will
              reload.
            </p>
            <div class="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmSwitch(null)}
                class="px-3 py-1.5 text-sm rounded-md border border-gray-200
                       dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitchAction}
                disabled={isPending()}
                class="px-3 py-1.5 text-sm rounded-md font-medium
                       bg-blue-600 hover:bg-blue-700 text-white
                       disabled:opacity-40 transition-colors"
              >
                Switch
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ManagePage;
