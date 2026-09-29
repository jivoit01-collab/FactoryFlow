/**
 * One vessel of the farm, drawn: a tank or an IBC tote, filled to its own
 * share of its OWN capacity and painted the colour of the oil in it.
 *
 * The drawing answers "how full is it, and with what"; the figures under it
 * answer "how much". Every vessel is drawn the same size, so a small full tank
 * draws as full as a large one, and the amount is read from the numbers, never
 * from the picture. The oil is named in words as well as painted, so nobody
 * has to tell two browns apart.
 *
 * Motion is one thing: the level eases to a new dip. It stops under
 * `prefers-reduced-motion`, where the level is simply where it is.
 */
import { type ReactNode, useId } from 'react';

import { StatusPill } from '@/shared/components';
import { cn } from '@/shared/utils';

import type { TankKind } from '../../types';
import { LOW_PCT, NEAR_FULL_PCT, resolveColor } from './farm';

// Tank geometry, in the drawing's own units.
const T_W = 100;
const T_H = 156;
const CX = 50;
const RX = 36; // half the shell's width
const RY = 8; // depth of the dome and base ellipses: what makes it a cylinder
const TOP = 20;
const BOT = 124;
const SPAN = BOT - TOP;

// Tote geometry: a squat bottle in a cage, on a pallet.
const B_W = 100;
const B_H = 102;
const BX = 12;
const BY = 16;
const BW = 76;
const BH = 56;

function Percent({ x, y, pct }: { x: number; y: number; pct: number }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={14}
      fontWeight={600}
      paintOrder="stroke"
      stroke="hsl(var(--card))"
      strokeWidth={3}
      className="fill-foreground tabular-nums"
    >
      {Math.round(pct)}%
    </text>
  );
}

const LIQUID_MOTION = 'transition-transform duration-700 ease-out motion-reduce:transition-none';

function TankShape({ pct, color, clipId }: { pct: number; color: string; clipId: string }) {
  const y = BOT - (SPAN * pct) / 100;
  const shell = `M${CX - RX} ${TOP} V${BOT} A${RX} ${RY} 0 0 0 ${CX + RX} ${BOT} V${TOP}`;
  return (
    <>
      <defs>
        {/* The oil is held by the shell and its rounded base, so a nearly
            empty tank pools in a curve instead of sitting on a straight line. */}
        <clipPath id={clipId}>
          <rect x={CX - RX} y={TOP} width={RX * 2} height={SPAN} />
          <ellipse cx={CX} cy={BOT} rx={RX} ry={RY} />
        </clipPath>
      </defs>

      {/* legs and ground */}
      <rect
        x={CX - RX + 6}
        y={BOT + 4}
        width={7}
        height={22}
        className="fill-muted-foreground/40"
      />
      <rect
        x={CX + RX - 13}
        y={BOT + 4}
        width={7}
        height={22}
        className="fill-muted-foreground/40"
      />
      <line
        x1={6}
        y1={BOT + 26}
        x2={T_W - 6}
        y2={BOT + 26}
        strokeWidth={1.5}
        className="stroke-muted-foreground/40"
      />

      {/* the empty shell, so an empty tank is not a hole */}
      <path d={`${shell} Z`} className="fill-muted" />

      {pct > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <g className={LIQUID_MOTION} style={{ transform: `translateY(${y}px)` }}>
            <rect x={CX - RX - 2} y={0} width={RX * 2 + 4} height={SPAN + RY * 2} fill={color} />
            {/* the surface, a shade lighter than the body */}
            <ellipse cx={CX} cy={0} rx={RX} ry={RY} fill={color} />
            <ellipse cx={CX} cy={0} rx={RX} ry={RY} fill="#ffffff" opacity={0.28} />
          </g>
        </g>
      )}

      {/* a highlight down the left, so the shell reads as round */}
      <rect x={CX - RX + 6} y={TOP + 4} width={6} height={SPAN - 4} fill="#ffffff" opacity={0.16} />
      {[1, 2].map((n) => (
        <line
          key={n}
          x1={CX - RX}
          y1={TOP + (SPAN * n) / 3}
          x2={CX + RX}
          y2={TOP + (SPAN * n) / 3}
          strokeWidth={1}
          className="stroke-muted-foreground/30"
        />
      ))}
      <path d={shell} fill="none" strokeWidth={1.5} className="stroke-muted-foreground/60" />

      {/* dome and manway */}
      <ellipse
        cx={CX}
        cy={TOP}
        rx={RX}
        ry={RY}
        strokeWidth={1.5}
        className="fill-muted stroke-muted-foreground/60"
      />
      <rect
        x={CX - 7}
        y={TOP - 13}
        width={14}
        height={7}
        rx={1.5}
        className="fill-muted-foreground/50"
      />

      <Percent x={CX} y={TOP + SPAN / 2} pct={pct} />
    </>
  );
}

function ToteShape({ pct, color, clipId }: { pct: number; color: string; clipId: string }) {
  const y = BY + BH - (BH * pct) / 100;
  const cage = 'stroke-muted-foreground/50';
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={BX} y={BY} width={BW} height={BH} rx={3} />
        </clipPath>
      </defs>

      {/* filler cap */}
      <rect x={42} y={5} width={16} height={7} rx={2} className="fill-muted-foreground/50" />

      {/* the plastic bottle */}
      <rect x={BX} y={BY} width={BW} height={BH} rx={3} className="fill-muted" />
      {pct > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <g className={LIQUID_MOTION} style={{ transform: `translateY(${y}px)` }}>
            {/* seen through the plastic: a little muted */}
            <rect x={BX} y={0} width={BW} height={BH + 4} fill={color} opacity={0.8} />
            <rect x={BX} y={0} width={BW} height={3} fill="#ffffff" opacity={0.3} />
          </g>
        </g>
      )}

      {/* the cage */}
      <rect
        x={BX - 4}
        y={BY - 4}
        width={BW + 8}
        height={BH + 8}
        rx={2}
        fill="none"
        strokeWidth={2}
        className={cage}
      />
      {[BX + BW / 3, BX + (BW * 2) / 3].map((x) => (
        <line
          key={x}
          x1={x}
          y1={BY - 4}
          x2={x}
          y2={BY + BH + 4}
          strokeWidth={1.25}
          className={cage}
        />
      ))}
      {[BY + BH / 4, BY + BH / 2, BY + (BH * 3) / 4].map((yy) => (
        <line
          key={yy}
          x1={BX - 4}
          y1={yy}
          x2={BX + BW + 4}
          y2={yy}
          strokeWidth={1.25}
          className={cage}
        />
      ))}

      {/* outlet valve and pallet */}
      <rect
        x={44}
        y={BY + BH + 5}
        width={12}
        height={5}
        rx={1}
        className="fill-muted-foreground/50"
      />
      <rect x={4} y={82} width={92} height={4} rx={1} className="fill-muted-foreground/40" />
      {[4, 44, 84].map((x) => (
        <rect key={x} x={x} y={86} width={12} height={8} className="fill-muted-foreground/40" />
      ))}
      <rect x={4} y={94} width={92} height={4} rx={1} className="fill-muted-foreground/40" />

      <Percent x={BX + BW / 2} y={BY + BH / 2} pct={pct} />
    </>
  );
}

export interface TankGlyphProps {
  code: string;
  kind: TankKind;
  /** How full, 0-100, of its own capacity. */
  pct: number;
  /** The oil's colour; the no-oil grey when empty. */
  color: string | null;
  oilName: string | null;
  /** The level and the capacity, already in the unit being read: "12,345 L". */
  levelText: string;
  capacityText: string;
  /** Not counted in the farm: drawn faded, and says so. */
  inactive?: boolean;
  /** Makes the drawing a button — to record a dip, say. */
  onSelect?: () => void;
  selectLabel?: string;
  /** Under the caption: actions for the vessel. */
  children?: ReactNode;
  className?: string;
}

export function TankGlyph({
  code,
  kind,
  pct,
  color,
  oilName,
  levelText,
  capacityText,
  inactive,
  onSelect,
  selectLabel,
  children,
  className,
}: TankGlyphProps) {
  // A url(#id) paint resolves across the whole document, so each drawing's
  // clip needs an id no other vessel on the page shares.
  const clipId = `tank-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const tote = kind === 'TOTES';
  const fill = resolveColor(color);
  const level = Math.min(Math.max(pct, 0), 100);
  const empty = level === 0 || !oilName;

  const drawing = (
    <svg
      viewBox={tote ? `0 0 ${B_W} ${B_H}` : `0 0 ${T_W} ${T_H}`}
      role="img"
      aria-label={`${code}: ${empty ? 'empty' : `${Math.round(level)}% full of ${oilName}`}`}
      className={cn('mx-auto h-auto w-full', tote ? 'max-w-36' : 'max-w-28')}
    >
      {tote ? (
        <ToteShape pct={empty ? 0 : level} color={fill} clipId={clipId} />
      ) : (
        <TankShape pct={empty ? 0 : level} color={fill} clipId={clipId} />
      )}
    </svg>
  );

  return (
    <figure
      className={cn(
        'flex min-w-0 flex-col items-center rounded-xl border bg-card p-3 shadow-sm',
        inactive && 'opacity-60',
        className,
      )}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-label={selectLabel ?? `Open ${code}`}
          title={selectLabel}
          className="w-full rounded-lg transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {drawing}
        </button>
      ) : (
        drawing
      )}

      <figcaption className="mt-2 w-full min-w-0 space-y-0.5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <span className="font-semibold tracking-wide">{code}</span>
          {inactive ? (
            <StatusPill tone="neutral">Not in use</StatusPill>
          ) : level >= NEAR_FULL_PCT && !empty ? (
            <StatusPill tone="blocked">Near full</StatusPill>
          ) : level > 0 && level < LOW_PCT && !empty ? (
            <StatusPill tone="warn">Low</StatusPill>
          ) : null}
        </div>
        <p className="flex min-w-0 items-center justify-center gap-1.5 text-sm text-muted-foreground">
          {oilName ? (
            <>
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: fill }}
              />
              <span className="truncate">{oilName}</span>
            </>
          ) : (
            <span className="italic">No oil</span>
          )}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{levelText}</span> of {capacityText}
        </p>
      </figcaption>

      {children && <div className="mt-2 w-full">{children}</div>}
    </figure>
  );
}
