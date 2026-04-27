import { MdFillDark_mode, MdFillLight_mode } from "solid-icons/md";
import { useTheme } from "../lib/useTheme";

const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      class="px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700  hover:opacity-80 transition-colors"
    >
      {theme() === "dark" ? <MdFillLight_mode /> : <MdFillDark_mode />}
    </button>
  );
};

export default ThemeToggle;
