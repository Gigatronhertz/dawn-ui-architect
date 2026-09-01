import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Swaps between the two states in the brand guide: Paper (white ground, ink
 * lettering) and Ink (black ground, white lettering, signal yellow logo).
 * Signal Yellow is the constant — it is identical in both.
 */
export const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the real theme after mount; render a stable
  // placeholder first so the icon never flips on the first paint.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`w-9 h-9 grid place-items-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${className}`}
    >
      {/* Sun when dark (click to lighten), moon when light */}
      <svg
        viewBox="0 0 24 24"
        className="w-[18px] h-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.6v2.2M12 19.2v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6" />
          </>
        ) : (
          <path d="M20.5 14.2A8.4 8.4 0 1 1 9.8 3.5a6.7 6.7 0 0 0 10.7 10.7z" />
        )}
      </svg>
    </button>
  );
};
