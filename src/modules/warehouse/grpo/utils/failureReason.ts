/**
 * Turn a SAP posting failure into one readable line.
 *
 * SAP rejections arrive either as a plain sentence ("SAP Service Layer
 * connection timeout") or as a Service Layer JSON envelope whose useful text is
 * buried under `error.message` — which is a bare string on some responses and
 * `{value}` on others. Neither raw form belongs in a table cell, so the human
 * sentence is dug out and the code appended; callers keep the raw text on a
 * title attribute for whoever needs the rest.
 *
 * Anything unparseable is returned untouched. Showing a slightly ugly string
 * beats swallowing the only clue about why a posting failed.
 */
export function failureReason(raw?: string | null): string {
  const text = (raw || '').trim();
  if (!text) return '';
  if (!text.startsWith('{')) return text;
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: { value?: string } | string; code?: string | number };
    };
    const message = parsed.error?.message;
    const value = typeof message === 'string' ? message : message?.value;
    const code = parsed.error?.code;
    if (value) return code ? `${value} (${code})` : value;
  } catch {
    // Not the envelope we expected — fall through and show what we were given.
  }
  return text;
}
