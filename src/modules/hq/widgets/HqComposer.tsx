// src/modules/hq/widgets/HqComposer.tsx
import { createSignal } from "solid-js";
import PostComposer from "@/shared/editor/composers/PostComposer";
import { useAuth } from "@/shared/store/auth-store";

export default function HqComposerSlot() {
  const auth = useAuth();
  if (auth.loading || !auth()?.isLocal) return null;

  const [open, setOpen] = createSignal(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-rim text-muted text-sm hover:bg-elevated hover:text-txt transition-colors"
      >
        <span class="text-base leading-none">✏️</span>
        What's on your mind?
      </button>

      <PostComposer
        profileUid={auth()!.uid}
        open={open()}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
