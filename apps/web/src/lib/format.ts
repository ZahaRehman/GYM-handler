import { format, parseISO } from 'date-fns'

export function formatMoney(amount: number, currency = 'PKR'): string {
  const n = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)
  const symbol = currency === 'PKR' ? 'Rs' : currency
  return `${symbol} ${n}`
}

/** Format a `YYYY-MM-DD` date column (no timezone shift). */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? parseISO(value) : value
  return format(d, 'd MMM yyyy')
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
