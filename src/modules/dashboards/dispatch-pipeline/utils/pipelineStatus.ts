import { PIPELINE_STAGE_LABEL, PIPELINE_STAGE_ROW_CLASSES } from '../constants';
import type { PipelineStage, PipelineStatus } from '../types';

/** Build a PipelineStatus from just a stage key (for rows whose status is the
 * raw stage, e.g. a docking's own status), so they render the same "X at Y"
 * badge as the API-provided ones. */
export function buildPipelineStatusFromStage(stage: PipelineStage): PipelineStatus {
  const label = PIPELINE_STAGE_LABEL[stage] ?? stage;
  return {
    stage,
    stage_label: label,
    stage_at: null,
    module: '',
    module_status: '',
    module_label: label,
  };
}

/** Whole-row tint class for a stage (empty string when unknown/absent). */
export function getPipelineStageRowClass(stage: PipelineStage | null | undefined): string {
  return stage ? PIPELINE_STAGE_ROW_CLASSES[stage] ?? '' : '';
}
