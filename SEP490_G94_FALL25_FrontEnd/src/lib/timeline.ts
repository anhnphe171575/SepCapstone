export function getSpanDays(viewMode: 'Days'|'Weeks'|'Months'|'Quarters', start: Date): number {
  switch (viewMode) {
    case 'Days': return 7;
    case 'Weeks': return 7;
    case 'Months': return daysInMonthUTC(start);
    case 'Quarters': return isLeapYearUTC(start.getUTCFullYear()) ? 366 : 365; // show whole year segmented by quarters
    default: return 7;
  }
}

export function getPeriodStart(viewMode: 'Days'|'Weeks'|'Months'|'Quarters', date: Date): Date {
  const d = new Date(date);
  const strip = (x: Date) => { const t = new Date(x); t.setUTCHours(0,0,0,0); return t; };
  switch (viewMode) {
    case 'Days':
    case 'Weeks': return getStartOfWeekUTC(strip(d));
    case 'Months': return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    case 'Quarters': return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    default: return getStartOfWeekUTC(strip(d));
  }
}

export function getStartOfWeekUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function stripTimeUTC(date: Date) {
  const d = new Date(date);
  d.setUTCHours(0,0,0,0);
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function daysInMonthUTC(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function daysInQuarterUTC(date: Date): number { // kept for potential future use
  const qStartMonth = Math.floor(date.getUTCMonth() / 3) * 3;
  const start = new Date(Date.UTC(date.getUTCFullYear(), qStartMonth, 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), qStartMonth + 3, 0));
  return (stripTimeUTC(end).getTime() - stripTimeUTC(start).getTime()) / (24*60*60*1000) + 1;
}

function isLeapYearUTC(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}


