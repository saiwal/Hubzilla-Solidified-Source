import { useNavViewer } from '@/shared/store/nav-store';
import { useI18n } from '@/i18n';

// The dashboard panels (perf stats, composer, drafts, upcoming events,
// messages) are registered as mainTop widgets in ../index.ts and rendered by
// Layout.tsx's <Slot name="mainTop" .../> above this view — that's what
// makes them user-rearrangeable/removable via the same edit-mode picker as
// every other widget.
export default function DashboardView() {
  const viewer = useNavViewer();
  const { t } = useI18n();

  return (
    <h1 class="text-2xl font-bold">{t("hq.welcome")}{viewer()?.name ? `, ${viewer()!.name}` : ''}.</h1>
  );
}
