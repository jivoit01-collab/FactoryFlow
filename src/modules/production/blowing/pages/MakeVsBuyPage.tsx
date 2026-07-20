import { ArrowLeft, Factory, RotateCcw, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DashboardHeader } from '@/shared/components/dashboard/DashboardHeader';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/shared/components/ui';

import { useMakeVsBuy } from '../api';
import type { MakeVsBuyRow, MakeVsBuyVerdict } from '../types';

const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d });

const VERDICT_BADGE: Record<MakeVsBuyVerdict, string> = {
  MAKE: 'bg-green-100 text-green-700',
  BUY: 'bg-amber-100 text-amber-700',
  NO_BUY_PRICE: 'bg-gray-100 text-gray-600',
};
const VERDICT_LABEL: Record<MakeVsBuyVerdict, string> = {
  MAKE: 'Make in‑house',
  BUY: 'Buy',
  NO_BUY_PRICE: 'Add a buy price',
};

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
const today = () => new Date().toISOString().slice(0, 10);

interface Factors {
  resin: number;
  tariff: number;
  volume: number;
  buy: number;
}
const NEUTRAL: Factors = { resin: 1, tariff: 1, volume: 1, buy: 1 };

interface DerivedRow extends MakeVsBuyRow {
  scnMake: number;
  scnBuy: number | null;
  scnDelta: number | null;
  scnBreakeven: number | null;
  scnSavings: number | null;
  scnGood: number;
  scnVerdict: MakeVsBuyVerdict;
}

function derive(row: MakeVsBuyRow, f: Factors): DerivedRow {
  const otherVar = row.variable_cost_per_bottle - row.preform_per_bottle - row.electricity_per_bottle;
  const newVar = row.preform_per_bottle * f.resin + row.electricity_per_bottle * f.tariff + otherVar;
  const scnGood = Math.round(row.good_bottles * f.volume);
  const scnMake = newVar + (scnGood > 0 ? row.fixed_cost_total / scnGood : 0);
  const scnBuy = row.buy_landed_per_bottle === null ? null : row.buy_landed_per_bottle * f.buy;
  const scnDelta = scnBuy === null ? null : scnBuy - scnMake;
  const contribution = scnBuy === null ? null : scnBuy - newVar;
  const scnBreakeven = contribution && contribution > 0 ? row.fixed_cost_total / contribution : null;
  const scnSavings = scnDelta === null ? null : scnDelta * scnGood;
  const scnVerdict: MakeVsBuyVerdict = scnBuy === null ? 'NO_BUY_PRICE' : scnDelta! >= 0 ? 'MAKE' : 'BUY';
  return { ...row, scnMake, scnBuy, scnDelta, scnBreakeven, scnSavings, scnGood, scnVerdict };
}

function Slider({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range" min={min} max={max} step={0.01} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

// Two-tone comparison bar: make vs buy per bottle.
function CompareBar({ make, buy }: { make: number; buy: number | null }) {
  if (buy === null) return <span className="text-muted-foreground">—</span>;
  const max = Math.max(make, buy) || 1;
  return (
    <div className="min-w-[160px] space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-8 text-xs text-muted-foreground">Make</span>
        <div className="h-3 flex-1 rounded bg-muted">
          <div className="h-3 rounded bg-green-500" style={{ width: `${(make / max) * 100}%` }} />
        </div>
        <span className="w-14 text-right text-xs">₹{fmt(make, 3)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 text-xs text-muted-foreground">Buy</span>
        <div className="h-3 flex-1 rounded bg-muted">
          <div className="h-3 rounded bg-amber-500" style={{ width: `${(buy / max) * 100}%` }} />
        </div>
        <span className="w-14 text-right text-xs">₹{fmt(buy, 3)}</span>
      </div>
    </div>
  );
}

function MakeVsBuyPage() {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [factors, setFactors] = useState<Factors>(NEUTRAL);
  const { data, isLoading } = useMakeVsBuy(dateFrom, dateTo);

  const scenarioOn = JSON.stringify(factors) !== JSON.stringify(NEUTRAL);

  const derived = useMemo(() => (data?.rows ?? []).map((r) => derive(r, factors)), [data, factors]);
  const totals = useMemo(() => {
    const good = derived.reduce((s, r) => s + r.scnGood, 0);
    const makeCost = derived.reduce((s, r) => s + r.scnMake * r.scnGood, 0);
    const buyCost = derived.reduce((s, r) => s + (r.scnBuy ?? 0) * r.scnGood, 0);
    const savings = derived.reduce((s, r) => s + (r.scnSavings ?? 0), 0);
    const hasBuy = derived.some((r) => r.scnBuy !== null);
    const verdict: MakeVsBuyVerdict = !hasBuy ? 'NO_BUY_PRICE' : savings >= 0 ? 'MAKE' : 'BUY';
    return { good, makeCost, buyCost, savings, verdict };
  }, [derived]);

  const set = (k: keyof Factors) => (v: number) => setFactors((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Make vs Buy"
        description="Is blowing bottles in‑house cheaper than buying them?"
      >
        <Button variant="outline" onClick={() => navigate('/production/blowing')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </DashboardHeader>

      <div className="flex flex-wrap gap-4">
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={dateFrom} max={today()} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={dateTo} max={today()} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Verdict banner */}
          <Card className={totals.verdict === 'MAKE' ? 'border-green-500/50' : totals.verdict === 'BUY' ? 'border-amber-500/50' : ''}>
            <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {totals.verdict === 'MAKE' ? <Factory className="h-8 w-8 text-green-600" /> : <ShoppingCart className="h-8 w-8 text-amber-600" />}
                <div>
                  <p className="text-sm text-muted-foreground">
                    Verdict for this period{scenarioOn && ' · scenario'}
                  </p>
                  <p className="text-2xl font-bold">
                    {totals.verdict === 'MAKE' ? 'Making is cheaper' : totals.verdict === 'BUY' ? 'Buying is cheaper' : 'No buy price set'}
                  </p>
                </div>
              </div>
              {totals.verdict !== 'NO_BUY_PRICE' && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {totals.savings >= 0 ? 'Savings by making' : 'Extra cost of making'} (period)
                  </p>
                  <p className={`text-2xl font-bold ${totals.savings >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    ₹ {fmt(Math.abs(totals.savings))}
                  </p>
                  <p className="text-xs text-muted-foreground">≈ ₹ {fmt(Math.abs(totals.savings) * 12)} / yr at this rate</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sensitivity sliders (Phase 4) */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <SlidersHorizontal className="h-4 w-4" /> What‑if scenario
              </CardTitle>
              {scenarioOn && (
                <Button variant="ghost" size="sm" onClick={() => setFactors(NEUTRAL)}>
                  <RotateCcw className="mr-1 h-3 w-3" /> Reset
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Slider label="Resin / preform price" value={factors.resin} onChange={set('resin')} min={0.5} max={2} />
              <Slider label="Electricity tariff" value={factors.tariff} onChange={set('tariff')} min={0.5} max={2} />
              <Slider label="Volume" value={factors.volume} onChange={set('volume')} min={0.2} max={3} />
              <Slider label="Buy price" value={factors.buy} onChange={set('buy')} min={0.5} max={2} />
            </CardContent>
          </Card>

          {/* Totals cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Good bottles</CardTitle></CardHeader>
              <CardContent className="text-xl font-bold">{fmt(totals.good, 0)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Make cost</CardTitle></CardHeader>
              <CardContent className="text-xl font-bold">₹ {fmt(totals.makeCost)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Buy cost</CardTitle></CardHeader>
              <CardContent className="text-xl font-bold">₹ {fmt(totals.buyCost)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Verdict</CardTitle></CardHeader>
              <CardContent><Badge className={VERDICT_BADGE[totals.verdict]}>{VERDICT_LABEL[totals.verdict]}</Badge></CardContent>
            </Card>
          </div>

          {/* Per-size table with comparison bars */}
          <Card>
            <CardHeader><CardTitle>By bottle size</CardTitle></CardHeader>
            <CardContent>
              {derived.length === 0 ? (
                <p className="text-muted-foreground">No runs in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4">Size</th>
                        <th className="py-2 pr-4">Make vs Buy / bottle</th>
                        <th className="py-2 pr-4 text-right">Δ /bottle</th>
                        <th className="py-2 pr-4 text-right">Breakeven</th>
                        <th className="py-2 pr-4 text-right">Volume</th>
                        <th className="py-2 pr-4 text-right">Savings</th>
                        <th className="py-2 pr-4">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {derived.map((r) => (
                        <tr key={r.preform_spec_id} className="border-b align-top">
                          <td className="py-2 pr-4">{r.make} {fmt(r.gram, 0)}g</td>
                          <td className="py-2 pr-4"><CompareBar make={r.scnMake} buy={r.scnBuy} /></td>
                          <td className={`py-2 pr-4 text-right ${r.scnDelta && r.scnDelta >= 0 ? 'text-green-600' : r.scnDelta ? 'text-amber-600' : ''}`}>
                            {r.scnDelta === null ? '—' : fmt(r.scnDelta, 4)}
                          </td>
                          <td className="py-2 pr-4 text-right">{r.scnBreakeven === null ? '—' : fmt(r.scnBreakeven, 0)}</td>
                          <td className="py-2 pr-4 text-right">{fmt(r.scnGood, 0)}</td>
                          <td className="py-2 pr-4 text-right">{r.scnSavings === null ? '—' : `₹ ${fmt(r.scnSavings)}`}</td>
                          <td className="py-2 pr-4"><Badge className={VERDICT_BADGE[r.scnVerdict]}>{VERDICT_LABEL[r.scnVerdict]}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {derived.some((r) => r.scnVerdict === 'NO_BUY_PRICE') && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Some sizes have no buy price. Add one under{' '}
                  <button className="underline" onClick={() => navigate('/production/blowing/master-data')}>
                    Master Data → Buy Prices
                  </button>{' '}
                  to unlock the comparison.
                </p>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Breakeven = fixed cost ÷ (buy price − variable cost/bottle). Above breakeven volume,
            making wins; below it, buying wins. Sliders re‑run the numbers live — resin & tariff
            scale the variable cost, volume changes fixed‑cost absorption per bottle.
          </p>
        </>
      )}
    </div>
  );
}

export default MakeVsBuyPage;
