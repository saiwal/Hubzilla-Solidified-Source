import { useTheme } from "../hooks/useTheme";

const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      class="mt-6 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:opacity-80 transition"
    >
      {theme() === "dark" ? "☀ Light" : "🌙 Dark"}
    </button>
  );
};

export default ThemeToggle;
