import { Bug, Headset, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/core/auth';
import { Button } from '@/shared/components/ui';
import { storage } from '@/shared/utils';

import { HEADER_TOUR_SEEN_KEY, HEADER_TOUR_TARGETS } from './headerTour';

interface TourStep {
  /** Value of the ``data-tour`` attribute on the button to spotlight. */
  target: string;
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * Two steps, both in the header. Kept deliberately short: this fires once, in
 * front of someone who opened the app to do something else.
 */
const STEPS: TourStep[] = [
  {
    target: HEADER_TOUR_TARGETS.support,
    icon: Headset,
    title: 'Customer support',
    body: 'Stuck on something? The support number sits here on every screen — tap to call it, or copy it on a desktop.',
  },
  {
    target: HEADER_TOUR_TARGETS.reportIssue,
    icon: Bug,
    title: 'Report an issue',
    body: 'Something broken or missing? File it here and it reaches the team with the screen you were on already attached.',
  },
];

const CARD_WIDTH = 320;
/** Breathing room between the spotlight and the card below it. */
const CARD_GAP = 12;
/** How far the spotlight ring sits outside the button it circles. */
const SPOTLIGHT_PADDING = 6;

function findTarget(name: string) {
  return document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
}

/**
 * A once-per-user overlay pointing at the two ways to get help: the support
 * number and the issue tracker. Both live in the header, where nobody looks
 * until they are told to.
 *
 * Seen-ness is kept per user in local storage, so a shared terminal does not
 * burn one person's tour on the next person, and a version bump on
 * :data:`HEADER_TOUR_SEEN_KEY` shows a changed tour again. The cost of that
 * choice is that a user on a second browser sees it a second time -- cheaper
 * than a column and a migration for two sentences.
 */
export function HeaderHelpTour() {
  const { user, permissionsLoaded } = useAuth();
  const seenKey = user ? `${HEADER_TOUR_SEEN_KEY}:${user.id}` : null;

  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Work out whether to run at all, and against which buttons. The issue
  // button only renders once permissions have arrived, so look again for a
  // few seconds instead of measuring once and deciding it does not exist.
  useEffect(() => {
    if (!seenKey || !permissionsLoaded) return;
    if (storage.get<boolean>(seenKey)) return;

    const look = () => {
      const present = STEPS.filter((step) => findTarget(step.target));
      if (present.length === 0) return false;
      setSteps(present);
      return true;
    };

    if (look()) return;

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (look() || attempts > 20) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [seenKey, permissionsLoaded]);

  const active = steps[index];
  const isLast = index === steps.length - 1;

  // Follow the button: the header shifts when the sidebar collapses and when
  // the window is resized, and a spotlight on the wrong spot is worse than
  // none at all.
  useEffect(() => {
    if (!active) return;

    const measure = () => {
      const element = findTarget(active.target);
      setRect(element ? element.getBoundingClientRect() : null);
    };

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active]);

  const finish = useCallback(() => {
    if (seenKey) storage.set(seenKey, true);
    setSteps([]);
    setIndex(0);
  }, [seenKey]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, finish]);

  if (!active || !rect) return null;

  const Icon = active.icon;

  const hole = {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  };

  // Hang the card under the button, pulled left enough to stay on screen —
  // these buttons live in the top-right corner.
  const cardWidth = Math.min(CARD_WIDTH, window.innerWidth - 32);
  const cardLeft = Math.min(
    Math.max(16, rect.right - cardWidth + rect.width / 2),
    window.innerWidth - cardWidth - 16,
  );
  const caretLeft = Math.min(
    Math.max(rect.left + rect.width / 2 - cardLeft, 16),
    cardWidth - 16,
  );

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="header-tour-title"
    >
      {/* Swallows clicks, so the app behind cannot be half-used through the
          dim. The dim itself is the spotlight's oversized box-shadow. */}
      <div className="absolute inset-0" />

      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
        }}
      />

      <div
        className="absolute rounded-lg border bg-popover p-4 text-popover-foreground shadow-xl"
        style={{ top: hole.top + hole.height + CARD_GAP, left: cardLeft, width: cardWidth }}
      >
        <div
          className="absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t bg-popover"
          style={{ left: caretLeft }}
        />

        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p id="header-tour-title" className="text-sm font-medium">
            {active.title}
          </p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{active.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {index + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {!isLast && (
              <Button variant="ghost" size="sm" onClick={finish}>
                Skip
              </Button>
            )}
            <Button size="sm" autoFocus onClick={isLast ? finish : () => setIndex(index + 1)}>
              {isLast ? 'Got it' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
