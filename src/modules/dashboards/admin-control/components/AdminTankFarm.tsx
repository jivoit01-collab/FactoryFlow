import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { AdminOilStorage, AdminOilTank } from '../types';
import { pct, tons, whole } from '../utils';

/** At or above this share of its own rating, a vessel is called out as near full. */
const NEAR_FULL_PCT = 90;

/* ────────────────────────────────────────────────────────────────────────────
 * Vessel geometry, in the glyph's own viewBox units.
 *
 * One SVG per vessel rather than one scene holding all of them: 32 tanks have
 * to wrap and scroll, and a single scene would need its own layout engine to
 * do what CSS grid already does. The shapes below are the mockup's, scaled to
 * a tank that stays legible at eight-across on a wall.
 * ──────────────────────────────────────────────────────────────────────────── */
const VB_W = 132;
const VB_H = 232;
const CX = 66;
const RX = 40; // half the shell width
const RY = 11; // the dome/base ellipse depth — what makes it a cylinder
const TOP = 24; // the dome's centre line
const BOT = 172; // the base ellipse's centre line
const SPAN = BOT - TOP;
const SKIRT = 194;
const GROUND = 198;

/**
 * One ripple line across the surface.
 *
 * Drawn wider than the vessel on both sides by a whole period, so scrolling it
 * by exactly one period loops with no visible seam.
 */
function wave(y: number, period: number, amp: number): string {
  const from = CX - RX - period * 2;
  const to = CX + RX + period * 2;
  let d = '';
  for (let x = from; x <= to; x += period / 10) {
    const py = y + amp * Math.sin((x / period) * Math.PI * 2);
    d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${py.toFixed(2)} `;
  }
  return d.trim();
}

/**
 * Where the oil's surface sits for a given percentage, in viewBox units.
 *
 * Exported so a test can assert the level without hard-coding the geometry —
 * the numbers above are free to change, the relationship is not.
 */
export function levelY(percent: number): number {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return BOT - (SPAN * clamped) / 100;
}

/** A vessel code is not guaranteed to be a legal id fragment. */
function safeId(code: string): string {
  return code.replace(/[^A-Za-z0-9_-]/g, '');
}

export interface AdminTankFarmProps {
  oil: AdminOilStorage;
  onClose: () => void;
}

/**
 * The tank farm, drawn as tanks.
 *
 * WHY A PICTOGRAM AND NOT A BAR CHART
 * A bar chart answers "which vessel holds the most" better than this does.
 * That is not the question anyone walks up to a tank farm with. The question is
 * "how full is each tank, and what is in it" — a fill fraction against a fixed
 * vessel, which is what the real object shows and what an operator already
 * reads off a gauge. The glyph maps 1:1 onto the thing it describes, so there
 * is nothing to learn before reading it.
 *
 * THE GLYPH ENCODES ONE THING: FILL FRACTION.
 * Liquid height is the vessel's own percentage of its OWN rating — never its
 * share of the farm. A 16 T tank that is full draws full beside a 100 T tank
 * that is full. That is the honest answer to "is this tank full"; the honest
 * answer to "how much oil is in it" is the tonnage printed under it, because
 * every vessel is drawn the same size and a uniform glyph cannot carry
 * magnitude without lying about it. Both questions get answered, each by the
 * encoding that can actually answer it.
 *
 * COLOUR DOES ONE JOB TOO
 * One hue — the Storage band's own — because every vessel holds the same
 * substance and there is nothing categorical to separate. The OIL is named in
 * text under each tank, so identity never rides on colour. Fifteen oils would
 * have needed fifteen hues nobody can tell apart; the label costs nothing and
 * works for every reader. "Near full" and "empty" are states, not series: they
 * take the reserved status tokens and each ships with a WORD in the legend.
 *
 * WHAT THE MOTION IS AND IS NOT
 * The liquid rises to its level once, on open. After that the surface keeps a
 * slow idle swell and three ripple lines travel across it at different periods
 * and two directions. NONE of that encodes anything — it is the cue that says
 * "this is a fluid", and it is why the tanks read as tanks rather than as
 * rounded bars. Under `prefers-reduced-motion` every bit of it stops and the
 * levels are simply already correct.
 */
export function AdminTankFarm({ oil, onClose }: AdminTankFarmProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // The liquid rises on open rather than appearing at its level. One frame of
  // empty vessels, then the real levels — the CSS transition does the rest. It
  // is also the honest order: the tank exists, then it fills.
  const [poured, setPoured] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPoured(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // A wall board is often driven by a keyboard on a shelf, so Escape has to
  // work; focus goes to Close so the panel is reachable without a mouse.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const vessels = oil.tank_rows ?? [];
  const groups = [
    {
      key: 'TANK',
      label: 'Tanks',
      note: 'counted in the headline',
      rows: vessels.filter((row) => row.type === 'TANK'),
    },
    {
      key: 'TOTES',
      label: 'Totes',
      note: 'IBC containers — outside the tank-farm percentage',
      rows: vessels.filter((row) => row.type !== 'TANK'),
    },
  ].filter((group) => group.rows.length > 0);

  const free =
    oil.capacity_tons != null && oil.total_tons != null
      ? Math.round((oil.capacity_tons - oil.total_tons) * 10) / 10
      : null;

  return (
    <div
      className="tf-scrim"
      // The scrim closes on click, but only when the click is the scrim itself
      // — a drag that ends outside the panel must not dismiss it.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="tf-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Tank farm: ${vessels.length} vessels, ${tons(oil.total_tons)} tonnes of oil`}
      >
        <TankDefs />

        <header className="tf-head">
          <div>
            <h2>Tank farm</h2>
            <p>
              {oil.warehouse} · {vessels.length} vessels · {tons(oil.total_tons)} T of{' '}
              {tons(oil.capacity_tons)} T rated
              {free != null && <> · {tons(free)} T free</>} · {whole(oil.total_litres)} litres in
              SAP
            </p>
          </div>
          <button type="button" className="tf-close" onClick={onClose} ref={closeRef}>
            <X size={16} aria-hidden="true" />
            <span className="tf-sr">Close</span>
          </button>
        </header>

        <div className="tf-body">
          {groups.map((group) => (
            <section key={group.key} className="tf-group">
              <h3>
                {group.label} <em>{group.note}</em>
              </h3>
              <div className="tf-row">
                {group.rows.map((vessel) => (
                  <Vessel key={vessel.code} vessel={vessel} poured={poured} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Colour is never the only encoding, so the two states it uses are
            spelled out rather than left to the eye. */}
        <footer className="tf-legend">
          <span className="tf-lk tf-lk-fill">Oil</span>
          <span className="tf-lk tf-lk-near">Near full (≥{NEAR_FULL_PCT}%)</span>
          <span className="tf-lk tf-lk-empty">Empty</span>
          <span className="tf-lk-note">
            Each tank is filled to its own rating, so a small full tank draws as full as a large
            one. The tonnage under it is the amount.
          </span>
        </footer>
      </div>
    </div>
  );
}

/**
 * The gradients, defined once for every vessel on the panel.
 *
 * A `url(#id)` paint resolves against the whole document, so 32 SVGs can share
 * one set rather than each carrying its own copy of four gradients.
 */
function TankDefs() {
  return (
    <svg className="tf-defs" aria-hidden="true" focusable="false">
      <defs>
        {/* The shell. Off-centre white band is what reads as a curved steel
            surface rather than a flat rectangle. */}
        <linearGradient id="tfSteel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C6D1DC" />
          <stop offset="20%" stopColor="#FFFFFF" />
          <stop offset="52%" stopColor="#E6EDF3" />
          <stop offset="100%" stopColor="#B4C1CE" />
        </linearGradient>
        <linearGradient id="tfOil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>
        {/* The glass over everything: a highlight down the left, a shadow on
            the right. Drawn ABOVE the oil, so the oil looks contained. */}
        <linearGradient id="tfSpec" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".10" />
          <stop offset="15%" stopColor="#FFFFFF" stopOpacity=".58" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity=".05" />
          <stop offset="100%" stopColor="#0E1726" stopOpacity=".13" />
        </linearGradient>
        {/* Darkens the oil just under its own surface — the shadow the shell
            casts on the liquid, which is most of why it reads as depth. */}
        <linearGradient id="tfWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#07485A" stopOpacity=".55" />
          <stop offset="100%" stopColor="#07485A" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Vessel({ vessel, poured }: { vessel: AdminOilTank; poured: boolean }) {
  const id = safeId(vessel.code);
  const level = Math.min(Math.max(vessel.used_pct ?? 0, 0), 100);
  const empty = vessel.stock_tons <= 0;
  const nearFull = level >= NEAR_FULL_PCT;

  // Where the surface sits. Clamped above, because a mis-keyed stock bigger
  // than the rating must overflow the NUMBER, not the glass — liquid drawn
  // above the shell reads as a rendering fault and hides the real one.
  const y = levelY(poured ? level : 0);

  const state = [empty ? 'is-empty' : '', nearFull ? 'is-near' : ''].filter(Boolean).join(' ');
  const title = `${vessel.code} — ${vessel.item}: ${tons(vessel.stock_tons)} T of ${tons(
    vessel.capacity_tons,
  )} T${vessel.used_pct != null ? ` (${pct(vessel.used_pct)})` : ''}`;

  // Three ripple periods, two directions. Memoised because the path strings are
  // 60-odd points each and never change.
  const waves = useMemo(
    () => [wave(-3.1, 20, 1.5), wave(0.5, 14, 1.15), wave(3.6, 26, 1.3)],
    [],
  );

  const shellPath = `M${CX - RX} ${TOP} V${BOT} A${RX} ${RY} 0 0 0 ${CX + RX} ${BOT} V${TOP}`;

  return (
    <figure className={`tf-vessel ${state}`} title={title}>
      <svg
        className="tf-glyph"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {/* The oil is clipped to the shell AND its elliptical base, so a
              nearly-empty tank pools in a curved bottom instead of sitting on
              a straight edge. */}
          <clipPath id={`tfClip-${id}`}>
            <rect x={CX - RX} y={TOP} width={RX * 2} height={SPAN} />
            <ellipse cx={CX} cy={BOT} rx={RX} ry={RY} />
          </clipPath>
          <clipPath id={`tfSurf-${id}`}>
            <ellipse cx={CX} cy={0} rx={RX - 1} ry={RY - 1} />
          </clipPath>
          <clipPath id={`tfGauge-${id}`}>
            <rect x={CX - RX - 11} y={TOP + 6} width={6} height={SPAN - 6} rx={3} />
          </clipPath>
        </defs>

        {/* ground and skirt */}
        <line className="tf-ground" x1="6" y1={GROUND} x2={VB_W - 6} y2={GROUND} />
        <path
          className="tf-steel"
          d={`M${CX - RX + 8} ${BOT - 2} H${CX + RX - 8} V${SKIRT} H${CX - RX + 8} Z`}
        />
        <path
          className="tf-shell"
          d={`M${CX - RX + 8} ${BOT + 4} V${SKIRT} M${CX + RX - 8} ${BOT + 4} V${SKIRT}`}
        />
        <path className="tf-rig" d={`M${CX - RX + 8} ${SKIRT} H${CX + RX - 8}`} />

        {/* shell behind the oil, so an empty tank is not a hole */}
        <path className="tf-steel tf-behind" d={`${shellPath} Z`} />

        {/* the oil */}
        <g clipPath={`url(#tfClip-${id})`}>
          <g className="tf-liquid" style={{ transform: `translateY(${y}px)` }}>
            <rect x={CX - RX - 2} y={0} width={RX * 2 + 4} height={SPAN + 60} fill="url(#tfOil)" />
            <rect
              className="tf-wallshade"
              x={CX - RX - 2}
              y={0}
              width={RX * 2 + 4}
              height={14}
            />
            <ellipse
              className="tf-ripple"
              cx={CX}
              cy={2}
              rx={RX}
              ry={RY}
              fill="#0E7490"
              opacity=".5"
            />
            <ellipse className="tf-surface" cx={CX} cy={0} rx={RX} ry={RY} fill="#22C3DD" />
            <g clipPath={`url(#tfSurf-${id})`}>
              <g className="tf-waves">
                {waves.map((d, index) => (
                  <path key={index} className={`tf-wv tf-w${index + 1}`} d={d} />
                ))}
              </g>
            </g>
            {/* the meniscus where the oil meets the wall */}
            <ellipse className="tf-cling" cx={CX} cy={0} rx={RX - 1} ry={RY - 0.5} />
          </g>
        </g>

        {/* glass over the oil, seams, shell outline */}
        <path className="tf-spec" d={`${shellPath} Z`} />
        <line
          className="tf-seam"
          x1={CX - RX}
          y1={TOP + SPAN / 3}
          x2={CX + RX}
          y2={TOP + SPAN / 3}
        />
        <line
          className="tf-seam"
          x1={CX - RX}
          y1={TOP + (SPAN * 2) / 3}
          x2={CX + RX}
          y2={TOP + (SPAN * 2) / 3}
        />
        <path className="tf-shell" d={shellPath} />

        {/* dome and manway */}
        <ellipse className="tf-steel" cx={CX} cy={TOP} rx={RX} ry={RY} />
        <ellipse className="tf-shell" cx={CX} cy={TOP} rx={RX} ry={RY} />
        <path className="tf-rig" d={`M${CX - 7} ${TOP - 4} h14 v-6 h-14 z`} />

        {/* sight glass, carrying the same level outside the shell */}
        <rect
          className="tf-gauge"
          x={CX - RX - 11}
          y={TOP + 6}
          width={6}
          height={SPAN - 6}
          rx={3}
        />
        <g clipPath={`url(#tfGauge-${id})`}>
          <g className="tf-liquid" style={{ transform: `translateY(${y}px)` }}>
            <rect
              x={CX - RX - 11}
              y={0}
              width={6}
              height={SPAN + 60}
              fill="url(#tfOil)"
            />
          </g>
        </g>

        {/* ladder */}
        <path
          className="tf-rig tf-thin"
          d={`M${CX + RX + 6} ${TOP + 4} V${SKIRT - 4} M${CX + RX + 13} ${TOP + 4} V${SKIRT - 4}`}
        />
        {Array.from({ length: Math.floor((SKIRT - TOP - 18) / 15) }, (_, index) => {
          const rungY = TOP + 15 + index * 15;
          return (
            <line
              key={rungY}
              className="tf-rig tf-thin"
              x1={CX + RX + 6}
              y1={rungY}
              x2={CX + RX + 13}
              y2={rungY}
            />
          );
        })}

        <text className="tf-level" x={CX} y={BOT + 24} textAnchor="middle">
          {vessel.used_pct != null ? pct(vessel.used_pct) : '—'}
        </text>
      </svg>

      <figcaption>
        <b>{vessel.code}</b>
        <span className="tf-item">{vessel.item}</span>
        <span className="tf-qty">
          {tons(vessel.stock_tons)} <i>/ {tons(vessel.capacity_tons)} T</i>
        </span>
      </figcaption>
    </figure>
  );
}
