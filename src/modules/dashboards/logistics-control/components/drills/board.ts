import type { useLogisticsControlBoard } from '../../hooks';

/** Everything the board holds, as the drill-downs read it. */
export type Board = ReturnType<typeof useLogisticsControlBoard>;
