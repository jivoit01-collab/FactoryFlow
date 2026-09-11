/**
 * The one-time "here is where to get help" tour.
 *
 * Shared between the header buttons being pointed at and
 * :func:`HeaderHelpTour`, so a renamed target cannot drift out of sync with
 * the step that looks for it.
 */

/** Values for the ``data-tour`` attribute on the buttons the tour highlights. */
export const HEADER_TOUR_TARGETS = {
  support: 'support',
  reportIssue: 'report-issue',
} as const;

/**
 * Per-user key recording that the tour has been seen. Bump the version when
 * the steps change materially — everybody is then shown the new tour once.
 */
export const HEADER_TOUR_SEEN_KEY = 'help-tour:header:v1';
