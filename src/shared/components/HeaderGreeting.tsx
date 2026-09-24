import { useEffect, useState } from 'react';

import { useAppSelector } from '@/core/store';

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Collapses stray whitespace. Falls back to a neutral greeting if unnamed. */
function displayNameOf(fullName: string | undefined): string | null {
  const name = fullName?.trim().replace(/\s+/g, ' ');
  return name ? name : null;
}

/**
 * The header line: who is signed in, and what day it is.
 *
 * Centred by absolute positioning rather than as a flex child: the company
 * chip on the left and the icon row on the right are different widths and
 * both change (the chip with the company name, the row with permissions), so
 * a flex child would sit wherever those happen to leave it. Against the header
 * it is centred on the viewport regardless.
 *
 * `pointer-events-none` because it is a label, not a control — it must never
 * swallow a click meant for the chip or an icon it overlaps.
 *
 * Sized from the space the two side groups actually leave, not a flat
 * percentage: the cap is the header width less twice the wider side, so a
 * centred line stops short of both. Below `md` that is the menu button and
 * the company chip against one overflow button (~8 rem a side); from `md` up
 * the icon row unfolds to five buttons (~15 rem a side). The `max()` floor
 * keeps the cap positive on a narrow viewport, where the two would otherwise
 * cross. Reserving the room this way fits a full name — "Kulbeer Singh
 * Sandhu", not "Kulbeer" — at the widths the plant actually runs.
 *
 * Truncates rather than wraps: the header is a fixed 4 rem and must not grow.
 * That is the last resort for a name longer than any of this, not the normal
 * case.
 *
 * Set in the system serif stack (`font-serif`) to give the one human line in
 * the chrome a different voice from the data everywhere else. It is a system
 * stack rather than a web font on purpose: this is an offline-capable PWA on
 * plant hardware, and a runtime font fetch would be one more thing to fail on
 * a bad connection for a purely decorative gain.
 *
 * The greeting is recomputed every minute so a screen left open across noon —
 * or overnight, as the wall boards are — does not still say "Good morning".
 */
export function HeaderGreeting() {
  const fullName = useAppSelector((state) => state.auth.user?.full_name);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const name = displayNameOf(fullName);

  return (
    <p className="pointer-events-none absolute left-1/2 hidden max-w-[max(9rem,calc(100%_-_17rem))] -translate-x-1/2 truncate text-center font-serif text-lg font-semibold tracking-tight sm:block md:max-w-[max(12rem,calc(100%_-_31rem))] md:text-xl">
      {greetingFor(now)}
      {name ? `, ${name}` : ''}
    </p>
  );
}
