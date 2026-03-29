import PerfStatsWidget from '../widgets/PerfStatsWidget';

export default function DashboardView() {
  return (
    <div class="space-y-6">
      <h1 class="text-2xl font-bold">Welcome</h1>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<PerfStatsWidget />
      </div>
    </div>
  );
}


