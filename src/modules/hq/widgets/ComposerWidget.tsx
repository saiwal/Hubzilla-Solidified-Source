/**
 * ComposerWidget.tsx
 * Right-sidebar slot widget for the HQ module.
 *
 * Renders a compact "New Post" card in the right sidebar. Clicking it
 * opens the full PostComposer modal. After a successful post the widget
 * briefly shows a confirmation state.
 */

import { createSignal, type Component } from "solid-js";
import { useAuth } from "../../../shared/store/auth-store";
import PostComposer from "../../../shared/views/PostComposer";

const ComposerWidget: Component = () => {
  const auth = useAuth();             // InitializedResource<AuthState>
  const [open,   setOpen]   = createSignal(false);
  const [posted, setPosted] = createSignal(false);

  function handlePosted() {
    setPosted(true);
    setTimeout(() => setPosted(false), 3000);
  }

  return (
    <>
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
            Compose
          </span>
          <svg class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>

        {/* Trigger area */}
        <div class="p-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            class={
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all " +
              (posted()
                ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 cursor-default"
                : "border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 " +
                  "hover:bg-indigo-50 dark:hover:bg-indigo-500/5 text-gray-400 dark:text-gray-500 " +
                  "hover:text-indigo-500 dark:hover:text-indigo-400 group")
            }
            disabled={posted()}
          >
            {posted() ? (
              <>
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
                <span class="text-sm font-medium">Posted!</span>
              </>
            ) : (
              <>
                <svg class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span class="text-sm">What's on your mind?</span>
              </>
            )}
          </button>
        </div>
      </div>

      <PostComposer
        open={open()}
        onClose={() => setOpen(false)}
        profileUid={auth()?.uid ?? 0}
        onPosted={handlePosted}
      />
    </>
  );
};

export default ComposerWidget;
