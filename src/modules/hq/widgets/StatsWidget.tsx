export default function StatsWidget() {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Users" value="1,204" />
      <StatCard label="Revenue" value="$8,492" />
      <StatCard label="Open tickets" value="37" />
    </div>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <p class="text-sm text-gray-500 dark:text-gray-400">{props.label}</p>
      <p class="text-2xl font-semibold mt-1">{props.value}</p>
    </div>
  );
}
