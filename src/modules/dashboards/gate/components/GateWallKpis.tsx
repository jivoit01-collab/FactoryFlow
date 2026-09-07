import { HardHat, LogIn, LogOut, Route, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { WallStat } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { count } from '../../dispatch/utils/format';
import type { GateBoard } from '../hooks/useGateBoard';

/**
 * The six numbers a security head wants before they have finished sitting down:
 * what came in, what went out, how many contractor hands are on site, how many
 * visitors signed in, who is inside this second, and how many vehicles are
 * still mid-journey between the two barriers.
 *
 * "Inside now" carries a warning sub-line rather than a second tile when people
 * have overstayed: a long-stay count is only ever read together with the total
 * it came out of, and two tiles side by side invite reading one without the
 * other.
 */
export function GateWallKpis({
  board,
  isToday,
  canViewJourney,
}: {
  board: GateBoard;
  isToday: boolean;
  canViewJourney: boolean;
}) {
  const navigate = useNavigate();
  const palette = useWallPalette();

  const spanNoun = isToday ? 'today' : 'in this range';

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <WallStat
        icon={LogIn}
        label="Vehicles in"
        value={count(board.vehiclesIn)}
        sub={`Inbound gate entries ${spanNoun}`}
        hex={palette.hue('gateIn')}
        delayMs={0}
        onClick={() => navigate('/gate/empty-vehicle-in')}
      />

      <WallStat
        icon={LogOut}
        label="Vehicles out"
        value={count(board.vehiclesOut)}
        sub={`Dispatch, returns & job work ${spanNoun}`}
        hex={palette.hue('gateOut')}
        delayMs={60}
        onClick={() => navigate('/gate/sales-dispatch')}
      />

      {/* Head-count at the barrier, with how much of it a department has
          claimed. The two are one tile because the second is only ever read as
          a share of the first. */}
      <WallStat
        icon={HardHat}
        label="Labours in"
        value={count(board.laboursIn)}
        sub={
          board.laboursIn === 0
            ? `No contractor labour ${isToday ? 'today' : `on ${board.labourDate}`}`
            : `${count(board.labourAllocated)} allocated to departments${
                isToday ? '' : ` · ${board.labourDate}`
              }`
        }
        hex={palette.hue('labour')}
        delayMs={120}
        onClick={() => navigate('/gate/labour-in')}
      />

      <WallStat
        icon={Users}
        label="Visitors in"
        value={count(board.visitorsIn)}
        sub={`Visitors signed in ${spanNoun}`}
        hex={palette.hue('visitors')}
        delayMs={180}
        onClick={() => navigate('/gate/visitor-labour')}
      />

      <WallStat
        icon={UserCheck}
        label="Inside now"
        value={count(board.insideNow)}
        sub={
          board.longStay > 0
            ? `${count(board.longStay)} over the long-stay limit`
            : 'People on site at this moment'
        }
        hex={palette.hue('inside')}
        delayMs={240}
        onClick={() => navigate('/gate/visitor-labour')}
      />

      <WallStat
        icon={Route}
        label="On the road"
        value={canViewJourney ? count(board.onRoad) : '—'}
        sub={
          canViewJourney
            ? 'Vehicles between the two barriers'
            : 'Needs the dispatch pipeline permission'
        }
        hex={palette.hue('journey')}
        delayMs={300}
        onClick={canViewJourney ? () => navigate('/dashboards/dispatch-pipeline') : undefined}
      />
    </div>
  );
}
