import { Show } from 'solid-js';
import HqComposerSlot from '../widgets/HqComposer';
import HqMessagesWidget from '../widgets/HqMessagesWidget';
import PerfStatsWidget from '../widgets/PerfStatsWidget';
import UpcomingEventsWidget from '../widgets/UpcomingEventsWidget';
import DraftsWidget from '../widgets/DraftsWidget';
import { useNavViewer } from '@/shared/store/nav-store';
import { useAuth } from '@/shared/store/auth-store';
import { useI18n } from '@/i18n';
import { helpable } from '@/shared/lib/helpable';
void helpable;

export default function DashboardView() {
  const viewer = useNavViewer();
  const auth = useAuth();
  const { t } = useI18n();

  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-bold">{t("hq.welcome")}{viewer()?.name ? `, ${viewer()!.name}` : ''}.</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="flex flex-col gap-4">
					<div use:helpable="hq.performance_widget">
						<PerfStatsWidget />
					</div>
          <div use:helpable="hq.post_composer">
            <HqComposerSlot />
          </div>
          <div use:helpable="hq.drafts_widget">
            <DraftsWidget />
          </div>
        </div>
        <div class="flex flex-col gap-4">
					<Show when={!auth.loading && auth()?.isLocal}>
            <div use:helpable="hq.upcoming_events_widget">
              <UpcomingEventsWidget />
            </div>
          </Show>
        </div>
        <div class="flex flex-col gap-4">
          <div use:helpable="hq.messages_widget">
            <HqMessagesWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
