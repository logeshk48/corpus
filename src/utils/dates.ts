export type Period = 'today' | 'week' | 'month' | 'year' | 'last12Months';

export type DateRange = {
  start: Date; // inclusive
  end: Date;   // exclusive
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Start and end of a period, in the user's local time
export function getRange(period: Period, now: Date = new Date(), cycleStartDay = 1): DateRange {
  const today = startOfDay(now);
  const startDay = Math.min(Math.max(1, Math.round(cycleStartDay)), 28);

  switch (period) {
    case 'today': {
      const end = new Date(today);
      end.setDate(end.getDate() + 1);
      return { start: today, end };
    }
    case 'week': {
      // Week starts on Monday (Indian convention)
      const dayIndex = (today.getDay() + 6) % 7; // Mon=0 ... Sun=6
      const start = new Date(today);
      start.setDate(start.getDate() - dayIndex);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case 'month': {
      // Your "month" can start on pay day: on the 25th with startDay 25, the cycle is 25 Oct → 25 Nov
      const started = now.getDate() >= startDay;
      const start = new Date(now.getFullYear(), now.getMonth() + (started ? 0 : -1), startDay);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, startDay);
      return { start, end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { start, end };
    }
    case 'last12Months': {
      // e.g. on 20 Oct 2026: 1 Nov 2025 → 1 Nov 2026
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end };
    }
  }
}

// Is this ISO date inside the range?
export function isInRange(iso: string, range: DateRange): boolean {
  const t = new Date(iso).getTime();
  return t >= range.start.getTime() && t < range.end.getTime();
}

// Days remaining in the month, counting today (used by Safe-to-Spend)
export function daysLeftInMonth(now: Date = new Date()): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}
// ── Day helpers (used by the date stepper) ─────────────────
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r; // keeps the time of day
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// The calendar day of `day` with the clock time of `time`
export function withTimeOf(day: Date, time: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
    time.getSeconds()
  );
}
