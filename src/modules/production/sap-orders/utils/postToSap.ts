import { toast } from 'sonner';

import { confirmSapPost } from '@/shared/components';
import { getErrorMessage } from '@/shared/utils';

interface ApiErrorShape {
  response?: { status?: number; data?: { code?: string } };
}

/** True when the server refused an identical post made moments ago (409 REPEAT_POST). */
export function isRepeatPost(error: unknown): boolean {
  const response = (error as ApiErrorShape)?.response;
  return response?.status === 409 && response.data?.code === 'REPEAT_POST';
}

/**
 * Send a write to SAP; if the server says the same thing was just posted, ask
 * once whether it really should go twice and resend with `confirm_repeat`.
 * Every other failure is shown here (the calls opt out of the client's toast).
 * Resolves to the result, or `null` when nothing was posted.
 */
export async function postToSap<T>(send: (confirmRepeat: boolean) => Promise<T>): Promise<T | null> {
  try {
    return await send(false);
  } catch (error) {
    if (isRepeatPost(error)) {
      const again = await confirmSapPost({
        title: 'Post this to SAP again?',
        description:
          'You posted exactly this less than two minutes ago. Check SAP first — post again only if it really should happen twice.',
        confirmLabel: 'Post again',
        destructive: true,
      });
      if (!again) return null;
      try {
        return await send(true);
      } catch (retryError) {
        toast.error(getErrorMessage(retryError, 'SAP refused the post.'));
        return null;
      }
    }
    toast.error(getErrorMessage(error, 'SAP refused the post.'));
    return null;
  }
}
