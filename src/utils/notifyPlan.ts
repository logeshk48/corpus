// Final pass over every phone notification before it's scheduled:
//  • quiet hours — nothing lands overnight; it moves to the end of quiet time
//  • how often  — everything / just the briefing + weekly review / only urgent
//  • no duplicates — same id once; anything already in that morning's briefing isn't sent again;
//    at most 3 other reminders a day (earliest first)
export type Planned = { id: string; date: Date; title: string; body: string };
export type NotifyMode = 'all' | 'digest' | 'urgent';
export type NotifyPrefs = { mode?: NotifyMode; quiet?: { from: number; to: number } | null; briefingHour?: number; briefingOn?: boolean };

const isBrief = (p: Planned) => p.id.startsWith('brief:');
const isWeek = (p: Planned) => p.id.startsWith('week:') || p.id.startsWith('month:');
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function inQuiet(d: Date, q: { from: number; to: number }) {
  const h = d.getHours() + d.getMinutes() / 60;
  return q.from > q.to ? h >= q.from || h < q.to : h >= q.from && h < q.to;
}
// move a time out of quiet hours: to `to` o'clock (the same morning, or the next one)
export function afterQuiet(d: Date, q: { from: number; to: number }) {
  if (!inQuiet(d, q)) return d;
  const sameMorning = q.from > q.to && d.getHours() < q.to;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (sameMorning ? 0 : 1), q.to, 0);
}
// urgent = due today / overdue / "did it go through?" style questions — not early heads-ups
const urgent = (p: Planned) => !/:(eve|3d)$/.test(p.id) && !/^(invest:checkup|checkin|budget)/.test(p.id);

export function finalizePlan(plan: Planned[], prefs: NotifyPrefs, now = new Date()): Planned[] {
  const mode = prefs.mode ?? 'all';
  const quiet = prefs.quiet === undefined ? { from: 22, to: 8 } : prefs.quiet;
  const briefOn = prefs.briefingOn !== false;
  // 1) how often
  let list = plan.filter((p) => (mode === 'digest' ? isBrief(p) || isWeek(p) : mode === 'urgent' ? isBrief(p) || urgent(p) : true));
  // 2) quiet hours (the briefing and weekly review are set by you — leave them alone)
  if (quiet) list = list.map((p) => (isBrief(p) || isWeek(p) ? p : { ...p, date: afterQuiet(p.date, quiet) }));
  // 3) no duplicates
  const seen = new Set<string>();
  list = list.filter((p) => p.date > now && !seen.has(p.id) && (seen.add(p.id), true));
  const briefDays = new Set(list.filter(isBrief).map((p) => dayKey(p.date)));
  const bh = prefs.briefingHour ?? 9;
  list = list.filter((p) => {
    if (isBrief(p) || isWeek(p) || !briefOn) return true;
    // already covered by that morning's briefing (anything before noon on a briefing day)
    return !(briefDays.has(dayKey(p.date)) && p.date.getHours() >= Math.min(bh, 8) && p.date.getHours() < 12);
  });
  // same title + same day = one
  const titles = new Set<string>();
  list = list.filter((p) => {
    const k = `${dayKey(p.date)}|${p.title}`;
    if (titles.has(k)) return false;
    titles.add(k);
    return true;
  });
  // at most 3 others a day
  list.sort((a, b) => a.date.getTime() - b.date.getTime());
  const perDay = new Map<string, number>();
  return list.filter((p) => {
    if (isBrief(p) || isWeek(p)) return true;
    const k = dayKey(p.date);
    const n = perDay.get(k) ?? 0;
    perDay.set(k, n + 1);
    return n < 3;
  });
}
