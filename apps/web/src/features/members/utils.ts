import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'
import { daysBetween } from '@/lib/dates'
import type { MemberStatus } from './schema'

export type DueStatus = 'paid' | 'due_soon' | 'due_today' | 'overdue' | 'paused' | 'left'

export type DueInfo = { status: DueStatus; days: number; label: string }

/**
 * Billing state of a member. `days` is days until due (negative when overdue).
 * Mirrors the rules in docs/03-database-schema.md §2.
 */
export function getDueInfo(nextDueDate: string, today: string, memberStatus: MemberStatus, upcomingWindowDays = 3): DueInfo {
  const days = daysBetween(today, nextDueDate)
  if (memberStatus === 'left') return { status: 'left', days, label: 'Left' }
  if (memberStatus === 'paused') return { status: 'paused', days, label: 'Paused' }
  if (days < 0) {
    const n = -days
    return { status: 'overdue', days, label: `${n} day${n === 1 ? '' : 's'} overdue` }
  }
  if (days === 0) return { status: 'due_today', days, label: 'Due today' }
  if (days <= upcomingWindowDays) return { status: 'due_soon', days, label: `Due in ${days} day${days === 1 ? '' : 's'}` }
  return { status: 'paid', days, label: 'Paid' }
}

/** Normalise user input like `0300 1234567` to E.164 `+923001234567`. Returns null when invalid. */
export function normalizePhone(input: string, defaultCountry: CountryCode = 'PK'): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const parsed = parsePhoneNumberFromString(trimmed.replace(/^00/, '+'), defaultCountry)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

/** Pretty display: +92 300 1234567 */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164)
  return parsed ? parsed.formatInternational() : e164
}

/** wa.me needs digits only, no plus. */
export function toWaLink(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, '')
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
