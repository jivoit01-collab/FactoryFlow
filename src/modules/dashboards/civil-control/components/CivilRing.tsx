import { NO_VALUE, num } from '../utils';

/** Geometry, in the SVG's own 48-unit box. */
const RADIUS = 19;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CivilRingProps {
  /** Work certified, 0 to 100 — or null where nobody has certified any. */
  pct: number | null;
  /** The accessible name. "Progress" alone is meaningless in a list of six. */
  label: string;
}

/**
 * The circle the whiteboard drew in its Progress column.
 *
 * WHY A RING AND NOT A BAR, in a table already full of bars: this column is the
 * one a reader scans down rather than across. A ring's fill is legible at a
 * glance at any row height and reads the same rotated on a wall screen, where a
 * 40%-full bar and a 55%-full bar in adjacent rows do not separate.
 *
 * THE RING IS NEVER THE ALARM. It is drawn in the band's own hue with the
 * remainder in grey — a composition, which is what rule 2 of the operations
 * colour system says tints are for. Whether a project is behind is a condition,
 * and conditions live in the pill beside it. A red ring here would be a fourth
 * colour meaning something the rest of the board says with a badge.
 *
 * NO CERTIFIED FIGURE DRAWS A HATCHED TRACK, not an empty one. A project nobody
 * has measured this month and a project where nothing has been built must not
 * look the same, and on a capex board that difference is somebody's job.
 */
export function CivilRing({ pct, label }: CivilRingProps) {
  const value = num(pct);
  const clamped = value === null ? null : Math.max(0, Math.min(100, value));
  const arc = clamped === null ? 0 : (clamped / 100) * CIRCUMFERENCE;

  return (
    <div className="civ-ring" data-nil={value === null ? '1' : undefined}>
      <svg
        viewBox="0 0 48 48"
        role="img"
        aria-label={
          value === null ? `${label}: no certified progress.` : `${label}: ${Math.round(value)}% done.`
        }
      >
        {/* The whole, so a ring at 8% still reads as a small part of a job
            rather than as a stray mark. */}
        <circle className="civ-ring__track" cx="24" cy="24" r={RADIUS} strokeWidth="6" />
        {clamped !== null && clamped > 0 && (
          <circle
            className="civ-ring__arc"
            cx="24"
            cy="24"
            r={RADIUS}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRCUMFERENCE - arc}`}
            /* Twelve o'clock, which is where a reader expects a ring to start.
               The default is three o'clock and every fill then reads about a
               quarter further on than it is. */
            transform="rotate(-90 24 24)"
          />
        )}
      </svg>
      <b>{value === null ? NO_VALUE : `${Math.round(value)}%`}</b>
    </div>
  );
}
