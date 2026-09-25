// A *live* transfer: one with no gate step, i.e. no truck — an internal stock
// transfer or an Oil → Mart invoice alike. These become receivable the moment
// the sender scans the first box, so the destination can accept/reject while the
// sender is still scanning. Mirrors `BSTService._is_live` on the backend. (Gated
// transfers stay sequential: scan → approve → gate → receive.)
export function isLiveBst(t: { requires_gate: boolean }): boolean {
  return !t.requires_gate;
}

/** Shared date+time formatting for BST screens (date + HH:MM, no seconds). */
export function formatBstDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * An ISO timestamp as an `<input type="datetime-local">` value — the local wall
 * clock the operator reads off their watch, minutes only.
 */
export function toBstDateTimeInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
