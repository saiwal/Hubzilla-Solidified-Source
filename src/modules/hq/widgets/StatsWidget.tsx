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
    <div class="bg-surface rounded-xl p-5 border border-rim">
      <p class="text-sm text-muted">{props.label}</p>
      <p class="text-2xl font-semibold mt-1">{props.value}</p>
    </div>
  );
}
