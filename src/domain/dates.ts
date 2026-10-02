const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as "YYYY-MM-DD" (one workout session per day). */
export function toDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The last `days` local day keys ending today, oldest first. */
export function lastDayKeys(days: number, now: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    // Step by local calendar day (setDate handles DST) rather than 24h blocks.
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(toDayKey(d.getTime()));
  }
  return keys;
}

export function daysAgo(days: number, now: number): number {
  return now - days * MS_PER_DAY;
}

/** Short weekday label for a "YYYY-MM-DD" key, e.g. "Mon". */
export function weekdayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
}

/** Local midnight (epoch ms) at the start of a "YYYY-MM-DD" key. */
export function startOfDayKey(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}
