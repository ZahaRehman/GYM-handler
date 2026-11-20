import { describe, expect, it } from 'vitest'
import { addMonthsISO, todayISO } from '@/lib/dates'
import { getDueInfo, normalizePhone, toWaLink } from './utils'

describe('getDueInfo', () => {
  const today = '2026-11-19'
  it('is paid when due date is beyond the window', () => {
    expect(getDueInfo('2026-11-30', today, 'active').status).toBe('paid')
  })
  it('is due soon inside the window', () => {
    expect(getDueInfo('2026-11-22', today, 'active')).toMatchObject({ status: 'due_soon', days: 3, label: 'Due in 3 days' })
  })
  it('is due today', () => {
    expect(getDueInfo(today, today, 'active').status).toBe('due_today')
  })
  it('is overdue with day count', () => {
    expect(getDueInfo('2026-11-18', today, 'active')).toMatchObject({ status: 'overdue', days: -1, label: '1 day overdue' })
  })
  it('paused and left override due state', () => {
    expect(getDueInfo('2026-10-01', today, 'paused').status).toBe('paused')
    expect(getDueInfo('2026-10-01', today, 'left').status).toBe('left')
  })
})

describe('normalizePhone', () => {
  it('handles local Pakistani formats', () => {
    expect(normalizePhone('0300 1234567')).toBe('+923001234567')
    expect(normalizePhone('03001234567')).toBe('+923001234567')
    expect(normalizePhone('+92 300 1234567')).toBe('+923001234567')
    expect(normalizePhone('0092-300-1234567')).toBe('+923001234567')
  })
  it('rejects invalid numbers', () => {
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('')).toBeNull()
  })
})

describe('toWaLink', () => {
  it('strips plus and encodes text', () => {
    expect(toWaLink('+923001234567', 'Hi Ali')).toBe('https://wa.me/923001234567?text=Hi%20Ali')
  })
})

describe('dates', () => {
  it('clamps month ends like Postgres', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonthsISO('2026-11-19', 3)).toBe('2027-02-19')
  })
  it('computes today in a timezone', () => {
    // 20:00 UTC on 19 Nov is already 20 Nov in Karachi (UTC+5)
    expect(todayISO('Asia/Karachi', new Date('2026-11-19T20:00:00Z'))).toBe('2026-11-20')
  })
})
