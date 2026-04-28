// src/modules/hq/widgets/HqComposer.tsx
import PostComposer from "@/shared/editor/composers/PostComposer";
import { useAuth } from "@/shared/store/auth-store";

export default function HqComposerSlot() {
  const auth = useAuth();
  // Don't render until auth settles, and only for local users
  if (auth.loading || !auth()?.isLocal) return null;
  return <PostComposer profileUid={auth()!.uid} />;
}
