import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns'

/** Today's date (YYYY-MM-DD) in the given IANA timezone, e.g. the gym's. */
export function todayISO(timeZone = 'Asia/Karachi', now = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Add months to a YYYY-MM-DD date, clamping month ends (31 Jan + 1 = 28/29 Feb), like Postgres. */
export function addMonthsISO(date: string, months: number): string {
  return format(addMonths(parseISO(date), months), 'yyyy-MM-dd')
}

export function daysBetween(fromISO: string, toISO: string): number {
  return differenceInCalendarDays(parseISO(toISO), parseISO(fromISO))
}
