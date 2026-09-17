import { HardHat, LogIn, LogOut, Route, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { WallStat } from '../../dispatch/components';
import { useWallPalette } from '../../dispatch/constants/wall.palette';
import { count } from '../../dispatch/utils/format';
import type { GateBoard } from '../hooks/useGateBoard';

/** What a tile shows instead of a figure the viewer was never allowed to ask
 *  for. An em dash, not a zero — see the note on the component below. */
const NO_ACCESS = '—';

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
 *
 * A tile the viewer has no right to reads "—", not "0". Each figure is fetched
 * only where the viewer can open the register behind it, so an ungranted section
 * arrives as a nought — and a nought on a wall board is a statement: "no vehicles
 * came in today", "nobody is inside". Printing that to someone who simply was not
 * allowed to ask is worse than printing nothing, because on a gate board those
 * two answers get acted on differently. The road tile has always said so; the
 * rest now do too.
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
  const { access } = board;

  return (
    <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <WallStat
        icon={LogIn}
        label="Vehicles in"
        value={access.inbound ? count(board.vehiclesIn) : NO_ACCESS}
        sub={
          access.inbound ? `Inbound gate entries ${spanNoun}` : 'Needs an inbound gate permission'
        }
        hex={palette.hue('gateIn')}
        delayMs={0}
        onClick={access.inbound ? () => navigate('/gate/empty-vehicle-in') : undefined}
      />

      <WallStat
        icon={LogOut}
        label="Vehicles out"
        value={access.outbound ? count(board.vehiclesOut) : NO_ACCESS}
        sub={
          access.outbound
            ? `Dispatch, returns & job work ${spanNoun}`
            : 'Needs an outbound gate permission'
        }
        hex={palette.hue('gateOut')}
        delayMs={60}
        onClick={access.outbound ? () => navigate('/gate/sales-dispatch') : undefined}
      />

      {/* Head-count at the barrier, with how much of it a department has
          claimed. The two are one tile because the second is only ever read as
          a share of the first. */}
      <WallStat
        icon={HardHat}
        label="Labours in"
        value={access.labour ? count(board.laboursIn) : NO_ACCESS}
        sub={
          !access.labour
            ? 'Needs the labour gate permission'
            : board.laboursIn === 0
              ? `No contractor labour ${isToday ? 'today' : `on ${board.labourDate}`}`
              : `${count(board.labourAllocated)} allocated to departments${
                  isToday ? '' : ` · ${board.labourDate}`
                }`
        }
        hex={palette.hue('labour')}
        delayMs={120}
        onClick={access.labour ? () => navigate('/gate/labour-in') : undefined}
      />

      <WallStat
        icon={Users}
        label="Visitors in"
        value={access.persons ? count(board.visitorsIn) : NO_ACCESS}
        sub={access.persons ? `Visitors signed in ${spanNoun}` : 'Needs the person gate permission'}
        hex={palette.hue('visitors')}
        delayMs={180}
        onClick={access.persons ? () => navigate('/gate/visitor-labour') : undefined}
      />

      <WallStat
        icon={UserCheck}
        label="Inside now"
        value={access.persons ? count(board.insideNow) : NO_ACCESS}
        sub={
          !access.persons
            ? 'Needs the person gate permission'
            : board.longStay > 0
              ? `${count(board.longStay)} over the long-stay limit`
              : 'People on site at this moment'
        }
        hex={palette.hue('inside')}
        delayMs={240}
        onClick={access.persons ? () => navigate('/gate/visitor-labour') : undefined}
      />

      <WallStat
        icon={Route}
        label="On the road"
        value={canViewJourney ? count(board.onRoad) : NO_ACCESS}
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
