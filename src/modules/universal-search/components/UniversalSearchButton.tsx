import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { UNIVERSAL_SEARCH_ACCESS } from '@/config/permissions';
import { usePermission } from '@/core/auth/hooks/usePermission';
import { Button } from '@/shared/components/ui';

import { UniversalSearchDialog } from './UniversalSearchDialog';

/** The shortcut, spelled for the platform the user is actually on. */
function shortcutLabel(): string {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return isMac ? '⌘K' : 'Ctrl+K';
}

/**
 * The header's search trigger, and the shortcut that opens it from anywhere.
 *
 * Ctrl+K / ⌘K is what every other search box in every other tool answers to,
 * so it is what this one answers to. It is bound only while the user holds the
 * right — a shortcut that opens a modal saying "you may not" would be worse
 * than no shortcut.
 */
export function UniversalSearchButton() {
  const { hasAnyPermission } = usePermission();
  const canSearch = hasAnyPermission(UNIVERSAL_SEARCH_ACCESS);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canSearch) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      // The browser's own find-in-page lives on Ctrl+F; Ctrl+K is a link
      // shortcut in some browsers, so it has to be claimed explicitly.
      event.preventDefault();
      setOpen((wasOpen) => !wasOpen);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canSearch]);

  if (!canSearch) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title={`Search anything (${shortcutLabel()})`}
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>
      <UniversalSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
