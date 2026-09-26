import type { ReactNode } from 'react';

const svg = (children: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/** Pack shapes (23 Sept 2026): a machine's icon is the pack it fills first tomorrow. */
export const ICON = {
  bottle: svg(
    <>
      <path d="M10 2.5h4" />
      <path d="M10.5 2.5v3.3c0 .6-.3 1.1-.8 1.5-1.4 1.1-2.2 2.7-2.2 4.5v7.7a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-7.7c0-1.8-.8-3.4-2.2-4.5-.5-.4-.8-.9-.8-1.5V2.5" />
      <path d="M7.5 13.5h9" />
    </>,
  ),
  can: svg(
    <>
      <rect x="4.5" y="8" width="15" height="13.5" rx="2.5" />
      <path d="M7 8V5.5h3.5V8" />
      <path d="M13 8V6.2a1.7 1.7 0 0 1 1.7-1.7h.6A1.7 1.7 0 0 1 17 6.2V8" />
      <path d="M4.5 13h15" />
    </>,
  ),
  tin: svg(
    <>
      <rect x="5" y="6.5" width="14" height="15" rx="1.5" />
      <path d="M5 10.5h14" />
      <path d="M14 6.5v-3h3v3" />
    </>,
  ),
  pouch: svg(
    <>
      <path d="M7 3.5h10" />
      <path d="M7.5 3.5 6.8 7c-1.2 2-1.8 4.6-1.8 7.6v4.9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4.9c0-3-.6-5.6-1.8-7.6l-.7-3.5" />
      <path d="M7 7h10" />
    </>,
  ),
  combo: svg(
    <>
      <path d="M4.5 10c0-1.4.6-2.5 1.5-3.2V4h3v2.8c.9.7 1.5 1.8 1.5 3.2v10a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20Z" />
      <path d="M13.5 10c0-1.4.6-2.5 1.5-3.2V4h3v2.8c.9.7 1.5 1.8 1.5 3.2v10a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5Z" />
    </>,
  ),
  go: svg(
    <>
      <path d="M7.5 16.5 16.5 7.5" />
      <path d="M9 7.5h7.5V15" />
    </>,
  ),
  check: svg(
    <>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </>,
  ),
  close: svg(
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>,
  ),
};

export const WAIT_ICON = {
  oil: svg(
    <>
      <path d="M12 3.5c3 3.6 5.5 6.9 5.5 10a5.5 5.5 0 0 1-11 0c0-3.1 2.5-6.4 5.5-10Z" />
    </>,
  ),
  pack: svg(
    <>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5Z" />
      <path d="M4 8.5 12 13l8-4.5M12 13v7" />
    </>,
  ),
  time: svg(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>,
  ),
  machine: svg(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 18 12-12" />
    </>,
  ),
  other: svg(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5M12 16h.01" />
    </>,
  ),
};
