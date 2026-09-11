import { useQuery } from '@tanstack/react-query';

import {
  SUPPORT_CONTACT_CACHE_KEY,
  SUPPORT_CONTACT_ENDPOINT,
  SUPPORT_CONTACT_FALLBACK,
  SUPPORT_CONTACT_QUERY_KEY,
  type SupportContactPayload,
} from '@/config/constants';
import { apiClient } from '@/core/api';
import { storage } from '@/shared/utils';

export interface SupportContact {
  /** As an admin typed it, for display. */
  phone: string;
  /** Ready for an anchor: `tel:+91…`. */
  telHref: string;
}

/**
 * Decide which number to show.
 *
 * Order matters, and the first rule is the one that is easy to get wrong: an
 * answer from the server always wins, **including a blank one**. Blank means
 * an admin deliberately took the number down, so falling back to a remembered
 * number there would keep publishing a line nobody answers.
 *
 * Only when the server has said nothing at all — still loading, or
 * unreachable — does the last number it served stand in, and only when even
 * that is absent does the build-time number.
 */
export function resolveSupportContact(
  served: SupportContactPayload | undefined,
  remembered: SupportContactPayload | null,
  fallback: SupportContactPayload = SUPPORT_CONTACT_FALLBACK,
): SupportContact | null {
  const resolved = served ?? remembered ?? fallback;
  if (!resolved.phone || !resolved.dial) return null;
  return { phone: resolved.phone, telHref: `tel:${resolved.dial}` };
}

/**
 * The raw configured value, blank included — for the settings form, which has
 * to show an empty field as an empty field rather than hiding itself.
 *
 * Shares its key with :func:`useSupportContact`, so the number is fetched once
 * and every screen showing it refreshes together when it is saved.
 */
export function useSupportContactSetting() {
  return useQuery({
    queryKey: SUPPORT_CONTACT_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<SupportContactPayload>(SUPPORT_CONTACT_ENDPOINT, {
        // A number nobody asked for is not worth a toast if it fails; the
        // screens simply say nothing about support.
        suppressErrorToast: true,
      });
      const payload = response.data;
      if (payload.phone && payload.dial) {
        storage.set(SUPPORT_CONTACT_CACHE_KEY, payload);
      } else {
        // Taken down on purpose — forget it, so the next offline load does
        // not resurrect it.
        storage.remove(SUPPORT_CONTACT_CACHE_KEY);
      }
      return payload;
    },
    // It changes about once a year. One fetch per session is plenty.
    staleTime: Infinity,
    retry: 1,
  });
}

/**
 * The support number, or `null` when there is none to show — callers hide
 * their support links on `null` rather than printing a dead number.
 *
 * The response is remembered in local storage so the login screen of a
 * browser that has been here before still shows the current number when the
 * backend is the thing that is broken.
 */
export function useSupportContact(): SupportContact | null {
  const { data } = useSupportContactSetting();

  return resolveSupportContact(data, storage.get<SupportContactPayload>(SUPPORT_CONTACT_CACHE_KEY));
}
