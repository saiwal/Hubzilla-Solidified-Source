import HqComposerSlot from '../widgets/HqComposer';
import HqMessagesWidget from '../widgets/HqMessagesWidget';
import PerfStatsWidget from '../widgets/PerfStatsWidget';

export default function DashboardView() {
  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-bold">Welcome</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 flex flex-col gap-4">
          <HqComposerSlot />
          <PerfStatsWidget />
        </div>
        <div class="flex flex-col">
          <HqMessagesWidget />
        </div>
      </div>
    </div>
  );
}


