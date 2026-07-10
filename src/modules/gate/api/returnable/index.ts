/**
 * Returnable gate pass API, re-exported for the gate module.
 *
 * The document is owned by the department (`modules/maintenance`), but two of its
 * four stages — gate out and gate in — happen here. Rather than duplicate the
 * client, the gate imports it through this barrel so gate code keeps importing
 * from `@/modules/gate/api`.
 */
export {
  RETURNABLE_QUERY_KEYS,
  returnableGatePassApi,
  useGateOutReturnable,
  useRecordReturnableReturn,
  useRejectReturnableAtGate,
  useReturnableGatePass,
  useReturnableGatePasses,
  useReturnablePendingGateIn,
  useReturnablePendingGateOut,
  useReturnableTimeline,
} from '@/modules/maintenance/api';
export type {
  ItemReturnCondition,
  ReturnableGateOutPayload,
  ReturnableGatePass,
  ReturnableGatePassItem,
  ReturnableGatePassListItem,
  ReturnableRecordReturnPayload,
  ReturnableReturnLineInput,
  ReturnableStatus,
  SapItem,
} from '@/modules/maintenance/types';
