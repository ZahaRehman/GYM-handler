import { describe, expect, it } from 'vitest'
import type { Plan } from '@/features/plans/schema'
import { normalizeHeader, parseFlexibleDate, validateRows } from './importMembers'

const plans = [
  { id: 'p1', name: 'Monthly', duration_months: 1, price: 3000, is_active: true, created_at: '' },
  { id: 'p3', name: 'Quarterly', duration_months: 3, price: 8000, is_active: true, created_at: '' },
] as Plan[]
const ctx = { plans, existingPhones: new Set(['+923009999999']), today: '2026-11-19' }

describe('normalizeHeader', () => {
  it('maps common spellings', () => {
    expect(normalizeHeader('Full Name')).toBe('full_name')
    expect(normalizeHeader('Mobile')).toBe('phone')
    expect(normalizeHeader('Due Date')).toBe('next_due_date')
    expect(normalizeHeader('random')).toBeNull()
  })
})

describe('parseFlexibleDate', () => {
  it('reads ISO and day-first formats', () => {
    expect(parseFlexibleDate('2026-01-31')).toBe('2026-01-31')
    expect(parseFlexibleDate('31/01/2026')).toBe('2026-01-31')
    expect(parseFlexibleDate('5/2/2026')).toBe('2026-02-05') // 5 Feb, not May 2
    expect(parseFlexibleDate('15 Mar 2026')).toBe('2026-03-15')
    expect(parseFlexibleDate('yesterday')).toBeNull()
  })
})

describe('validateRows', () => {
  it('accepts a good row and fills fee from the plan', () => {
    const [r] = validateRows([{ full_name: 'Ali', phone: '0300 1234567', plan: 'monthly', next_due_date: '01/12/2026' }], ctx)
    expect(r.errors).toEqual([])
    expect(r.payload).toMatchObject({ phone: '+923001234567', plan_id: 'p1', fee_amount: 3000, next_due_date: '2026-12-01', join_date: '2026-11-19' })
  })
  it('reports problems per row', () => {
    const rows = validateRows([
      { full_name: '', phone: 'abc', plan: 'Gold' },
      { full_name: 'Sara', phone: '03009999999', plan: 'Monthly' },
      { full_name: 'Twin A', phone: '03001111111', plan: 'Monthly' },
      { full_name: 'Twin B', phone: '0300-1111111', plan: 'Monthly' },
    ], ctx)
    expect(rows[0].errors.join(' ')).toMatch(/Name is missing.*not a valid number.*Unknown plan "Gold"/)
    expect(rows[1].errors).toContain('A member with this phone already exists')
    expect(rows[2].errors).toEqual([])
    expect(rows[3].errors).toContain('Same phone appears twice in the file')
    expect(rows[0].line).toBe(2) // header is line 1
  })
  it('warns when due date is missing', () => {
    const [r] = validateRows([{ full_name: 'Ali', phone: '03001234567', plan: 'Monthly' }], ctx)
    expect(r.warnings[0]).toMatch(/due today/)
    expect(r.payload?.next_due_date).toBe('2026-11-19')
  })
})
