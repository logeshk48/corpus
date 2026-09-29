export type Period = 'today' | 'week' | 'month' | 'year';

export type DateRange = {
  start: Date; // inclusive
  end: Date;   // exclusive
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Start and end of a period, in the user's local time
export function getRange(period: Period, now: Date = new Date()): DateRange {
  const today = startOfDay(now);

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
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { start, end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
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