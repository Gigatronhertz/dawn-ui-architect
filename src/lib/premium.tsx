/**
 * Premium features — locked for now.
 *
 * Everything on Karije is free while we're in beta. Features that will be
 * paid (AI drafting and suggestions, AI plan packs, pay-monthly instalments,
 * the bookkeeping/money tab, Pro subscription billing) stay visible so people
 * know they're coming, but are dimmed, unclickable and tagged "Premium".
 *
 * One switch: set VITE_PREMIUM_LOCKED=false to unlock everything. The backend
 * has its own matching switch (PREMIUM_LOCKED) so a locked feature can't be
 * reached by calling the API directly.
 */
import type { ReactNode } from "react";

export const PREMIUM_LOCKED = import.meta.env.VITE_PREMIUM_LOCKED !== "false";

export const PremiumTag = ({ className = "" }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 kj-label text-[10px] tracking-[0.14em] bg-signal text-ink px-1.5 py-0.5 whitespace-nowrap ${className}`}
  >
    <span aria-hidden="true">★</span> Premium
  </span>
);

/**
 * Wraps a premium control. While locked it renders dimmed, can't be clicked,
 * tabbed to or read as interactive, and carries a Premium tag in its corner.
 * Unlocked, it renders the children untouched.
 */
export function Premium({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (!PREMIUM_LOCKED) return <>{children}</>;
  return (
    <div className={`relative ${className}`} title="Premium — coming soon">
      <div
        aria-disabled="true"
        className="opacity-40 pointer-events-none select-none grayscale-[30%]"
        {...({ inert: "" } as Record<string, string>)}
      >
        {children}
      </div>
      <PremiumTag className="absolute -top-2 right-2 z-10" />
    </div>
  );
}
