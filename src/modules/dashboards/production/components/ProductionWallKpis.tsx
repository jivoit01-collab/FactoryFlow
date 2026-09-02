import { Boxes, ClipboardCheck, Coins, Droplets, Factory, Recycle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type SparkPoint, WallStat } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { compact, count, deltaPct, money } from '../../dispatch/utils/format';
import { reconTone } from '../constants/production-wall.constants';
import type { ProductionBoard, ProductionDay } from '../hooks';
import { formatLitres } from '../utils/litres';

/**
 * The six numbers a plant head wants before they have finished sitting down:
 * what came off the lines, how much of it in litres, how many lines are
 * actually running, whether SAP agrees, what it cost and what was thrown away.
 *
 * Three of them can be honestly unknown, and each says so rather than showing a
 * confident zero — litres and the SAP gap when SAP is unreachable, cost when
 * the run has no Cost Master rates behind it. A wall that quietly reads ₹0 for
 * a week is worse than no wall at all.
 */
export function ProductionWallKpis({
  board,
  day,
  unitNoun,
}: {
  board: ProductionBoard;
  day: ProductionDay;
  unitNoun: string;
}) {
  const navigate = useNavigate();
  const palette = useWallPalette();

  const openRuns = () => navigate('/production/execution');
  const openCost = () => navigate('/production/execution/reports/cost-analysis');
  const openWaste = () => navigate('/production/execution/waste');

  const casesSpark: SparkPoint[] = board.trend.map((point) => ({
    key: point.date,
    value: point.cases,
    isToday: point.isToday,
  }));
  const costSpark: SparkPoint[] = board.trend.map((point) => ({
    key: point.date,
    value: point.cost,
    isToday: point.isToday,
  }));

  // Cost only earns a comparison when both days were actually costed; against
  // an uncosted yesterday every day looks like a record.
  const yesterday = board.trend[board.trend.length - 2];
  const todayPoint = board.trend[board.trend.length - 1];
  const costDelta =
    yesterday && yesterday.perCase > 0 && todayPoint && todayPoint.perCase > 0
      ? deltaPct(todayPoint.perCase, yesterday.perCase)
      : null;

  const fgVerdict = reconTone(board.fg.status);
  const litresKnown = !board.fg.isError && board.fg.rows.length > 0;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <WallStat
        icon={Boxes}
        label={`${unitNoun}s produced`}
        value={count(board.cases)}
        sub={
          board.liveCases > 0
            ? `${count(board.liveCases)} still on the line`
            : `${count(board.runs.length)} runs ${day.isToday ? 'today' : 'that day'}`
        }
        hex={palette.hue('cases')}
        spark={casesSpark}
        delayMs={0}
        onClick={openRuns}
      />

      <WallStat
        icon={Droplets}
        label="Volume produced"
        value={litresKnown ? formatLitres(board.fg.litres.app) : '—'}
        sub={
          board.fg.isError
            ? 'SAP unreachable — volume comes from the item master'
            : board.fg.litres.unknown > 0
              ? `${board.fg.litres.unknown} SKU${board.fg.litres.unknown === 1 ? '' : 's'} carry no SAP volume`
              : 'SAP item master · litres per piece × pack'
        }
        hex={palette.hue('litres')}
        delayMs={60}
      />

      <WallStat
        icon={Factory}
        label="Lines running"
        value={`${count(board.runningLines)}/${count(board.runs.length)}`}
        sub={
          board.runs.length === 0
            ? 'no runs opened'
            : `${count(board.runs.length - board.runningLines)} stopped or finished`
        }
        hex={palette.hue('runs')}
        delayMs={120}
        onClick={openRuns}
      />

      <WallStat
        icon={ClipboardCheck}
        label="App vs SAP (FG)"
        value={board.fg.isError ? '—' : count(board.fg.difference)}
        sub={
          board.fg.isError
            ? 'SAP could not be reached for reconciliation'
            : `${fgVerdict.label} · SAP ${count(board.fg.sap)} ${unitNoun}s`
        }
        hex={palette.hue('match')}
        delayMs={180}
      />

      <WallStat
        icon={Coins}
        label={`Cost / ${unitNoun}`}
        // A run that has closed no cases has no per-case rate yet, however much
        // it has spent — the day's spend goes in the sub-line instead of being
        // divided by nothing.
        value={board.cost.costedCases > 0 ? money(board.cost.perCase) : '—'}
        sub={
          board.cost.total > 0 && board.cost.costedCases === 0
            ? `${money(board.cost.net)} spent · no ${unitNoun}s closed yet`
            : board.cost.total > 0
              ? board.cost.includesMaterial
                ? `${money(board.cost.net)} for ${count(board.cost.runCount)} costed runs`
                : `${money(board.cost.net)} conversion only · excl. RM/PM ${money(board.cost.material)}`
              : board.cost.material > 0
                ? `All of it was RM/PM — ${money(board.cost.material)} switched out`
                : 'No cost on these runs yet'
        }
        hex={palette.hue('cost')}
        delta={costDelta}
        invertDelta
        spark={costSpark}
        delayMs={240}
        onClick={openCost}
      />

      <WallStat
        icon={Recycle}
        label="Wastage logged"
        value={board.waste.isError ? '—' : compact(board.waste.produced)}
        sub={
          board.waste.isError
            ? 'SAP could not be reached for scrap'
            : `SAP ${compact(board.waste.sap)} into BH-WST`
        }
        hex={palette.hue('waste')}
        delayMs={300}
        onClick={openWaste}
      />
    </div>
  );
}
