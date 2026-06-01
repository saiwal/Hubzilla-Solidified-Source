import { Show } from 'solid-js';
import HqComposerSlot from '../widgets/HqComposer';
import HqMessagesWidget from '../widgets/HqMessagesWidget';
import PerfStatsWidget from '../widgets/PerfStatsWidget';
import UpcomingEventsWidget from '../widgets/UpcomingEventsWidget';
import DraftsWidget from '../widgets/DraftsWidget';
import { useNavViewer } from '@/shared/store/nav-store';
import { useAuth } from '@/shared/store/auth-store';

export default function DashboardView() {
  const viewer = useNavViewer();
  const auth = useAuth();

  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-bold">Welcome{viewer()?.name ? `, ${viewer()!.name}` : ''}.</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 flex flex-col gap-4">
          <HqComposerSlot />
          <Show when={!auth.loading && auth()?.isLocal}>
            <UpcomingEventsWidget />
          </Show>
          <PerfStatsWidget />
        </div>
        <div class="flex flex-col gap-4">
          <DraftsWidget />
          <HqMessagesWidget />
        </div>
      </div>
    </div>
  );
}
