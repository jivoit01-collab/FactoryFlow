import type { StatusTone } from '@/shared/components/page';

import type { CheckStatus } from './types';

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  PASS: 'OK',
  FAIL: 'Not OK',
  REVIEW: 'Needs a look',
  UNKNOWN: 'Not checked',
};

export const CHECK_STATUS_TONES: Record<CheckStatus, StatusTone> = {
  PASS: 'done',
  FAIL: 'blocked',
  REVIEW: 'warn',
  UNKNOWN: 'neutral',
};
