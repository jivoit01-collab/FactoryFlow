/** Shared date+time formatting for BST screens (date + HH:MM, no seconds). */
export function formatBstDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
