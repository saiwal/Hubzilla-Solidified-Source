// src/modules/articles/slots/ArticlesSidebarSlot.tsx
import { createSignal, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useAuth } from "@/shared/store/auth-store";
import { useViewerRole } from "@/shared/store/site-config";
import { BiRegularEdit, BiRegularX } from "solid-icons/bi";
import ArticleComposer from "@/shared/editor/composers/ArticleComposer";

export default function ArticlesSidebarSlot() {
  const auth = useAuth();
  const role = useViewerRole();
  const [open, setOpen] = createSignal(false);

  if (role() !== "owner") return null;

  let dialogRef: HTMLDialogElement | undefined;

  const openDialog = () => {
    setOpen(true);
    // Use native dialog so browser handles focus trap + backdrop
    dialogRef?.showModal();
  };

  const closeDialog = () => {
    dialogRef?.close();
    setOpen(false);
  };

  return (
    <>
      {/* ── Sidebar button ── */}
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted px-1">
          Articles
        </p>
        <button
          type="button"
          onClick={openDialog}
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                 border border-rim text-muted hover:bg-elevated hover:text-txt
                 transition-colors text-sm"
        >
          <BiRegularEdit class="w-4 h-4 shrink-0" />
          New article
        </button>
      </div>

      {/* ── Modal (Portal so it escapes sidebar stacking context) ── */}
      <Portal mount={document.body}>
        <dialog
          ref={dialogRef}
          onClick={(e) => {
            // Click on backdrop (the dialog element itself) closes it
            if (e.target === dialogRef) closeDialog();
          }}
          class="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl
                 bg-base border border-rim shadow-xl p-0
                 backdrop:bg-black/50
                 open:animate-[fadeIn_150ms_ease]"
        >
          <Show when={open()}>
            {/* Dialog header */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-rim sticky top-0 bg-base z-10">
              <h2 class="text-sm font-semibold text-txt">New article</h2>
              <button
                type="button"
                onClick={closeDialog}
                class="p-1 rounded text-muted hover:bg-elevated transition-colors"
              >
                <BiRegularX class="w-5 h-5" />
              </button>
            </div>

            {/* ArticleComposer fills the dialog body */}
            <ArticleComposer
              profileUid={auth()!.uid}
              onSaved={() => {
                closeDialog();
                // Optionally refresh article list here
              }}
            />
          </Show>
        </dialog>
      </Portal>
    </>
  );
}
