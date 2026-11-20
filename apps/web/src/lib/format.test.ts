import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, initials } from './format'

describe('formatMoney', () => {
  it('formats PKR with Rs and separators', () => {
    expect(formatMoney(30000)).toBe('Rs 30,000')
  })
  it('uses the currency code for others', () => {
    expect(formatMoney(1500, 'USD')).toBe('USD 1,500')
  })
})

describe('formatDate', () => {
  it('formats a date column without timezone shift', () => {
    expect(formatDate('2026-11-01')).toBe('1 Nov 2026')
  })
})

describe('initials', () => {
  it('takes first letters of first two words', () => {
    expect(initials('muhammad ali khan')).toBe('MA')
    expect(initials('  Sara ')).toBe('S')
  })
})
