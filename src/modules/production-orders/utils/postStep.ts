import { toast } from 'sonner';

import { getErrorMessage } from '@/shared/utils';

import type { StepKey, StepResponse } from '../api';
import { STEP_LABEL } from './format';
import { pathAfterPosting } from './steps';

/**
 * Say how a save (and its post, when asked) came out, and where to go next:
 * the next step's page once SAP took it, this page while SAP waits or refused.
 * Returns that path, or null to stay.
 */
export function afterSave(response: StepResponse, step: StepKey): string | null {
  const result = response.result;
  if (!result) {
    toast.success('Saved as a draft.');
    return null;
  }
  if (result.outcome === 'POSTED') {
    toast.success(result.message || `${STEP_LABEL[step]} posted to SAP.`);
    return pathAfterPosting(response.entry, step);
  }
  if (result.outcome === 'WAITING') {
    toast.warning(
      'SAP is not answering. This is saved and goes to SAP by itself when SAP is back.',
    );
    return null;
  }
  if (result.outcome === 'IN_PROGRESS') {
    toast.info(result.message);
  } else {
    toast.error(result.message || 'SAP refused it.');
  }
  return null;
}

/** A save or post the server refused before SAP was asked. */
export function saveFailed(error: unknown, post: boolean): void {
  toast.error(getErrorMessage(error, post ? 'Nothing was sent to SAP.' : 'Could not save.'));
}
