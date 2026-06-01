import { useNavigate } from "@solidjs/router";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <span class="text-8xl font-bold text-gray-200 dark:text-gray-700 select-none">404</span>
      <h1 class="text-2xl font-semibold">Page not found</h1>
      <p class="text-gray-500 dark:text-gray-400 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button
        onClick={() => navigate("/hq", { replace: true })}
        class="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Go home
      </button>
    </div>
  );
}
