import { toast } from 'sonner';

import { confirmSapPost } from '@/shared/components';
import { getErrorMessage } from '@/shared/utils';

interface ApiErrorShape {
  response?: { status?: number; data?: { code?: string } };
}

/**
 * True when the server refused a post it may already hold and the operator
 * can confirm it: the same thing posted moments ago (409 REPEAT_POST), or
 * posted earlier without SAP answering (409 UNCERTAIN_POST). A posting still
 * in flight (POSTING_IN_PROGRESS) is not confirmable — wait for it.
 */
export function isRepeatPost(error: unknown): boolean {
  const response = (error as ApiErrorShape)?.response;
  return (
    response?.status === 409 &&
    (response.data?.code === 'REPEAT_POST' || response.data?.code === 'UNCERTAIN_POST')
  );
}

function isUncertainPost(error: unknown): boolean {
  return (error as ApiErrorShape)?.response?.data?.code === 'UNCERTAIN_POST';
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
        // The server's own words: when it was sent, and whether SAP answered.
        description: isUncertainPost(error)
          ? getErrorMessage(error, 'SAP did not answer when this was last posted, so it may have gone through. Check SAP first.')
          : 'You posted exactly this less than two minutes ago. Check SAP first — post again only if it really should happen twice.',
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
