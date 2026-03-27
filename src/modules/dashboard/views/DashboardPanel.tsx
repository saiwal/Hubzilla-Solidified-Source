export default function DashboardPanel() {
  return (
    <div class="space-y-4">
      <h2 class="font-semibold text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Activity
      </h2>
      <ul class="space-y-3 text-sm">
        <li class="text-gray-700 dark:text-gray-300">Alice created a ticket</li>
        <li class="text-gray-700 dark:text-gray-300">Bob closed #204</li>
        <li class="text-gray-700 dark:text-gray-300">Deploy succeeded</li>
      </ul>
    </div>
  );
}
