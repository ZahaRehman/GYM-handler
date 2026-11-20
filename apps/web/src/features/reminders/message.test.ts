import { describe, expect, it } from 'vitest'
import { renderMemberMessage } from './message'

describe('renderMemberMessage', () => {
  it('matches the SQL renderer output', () => {
    // Same expectation as supabase/tests/database/reminders.test.sql
    expect(renderMemberMessage('Hi {name}, your {gym} fee of {currency} {amount} is due today ({due_date}).',
      { full_name: 'Today Tariq', fee_amount: 3500, next_due_date: '2026-06-10', member_code: 1 },
      { gym_name: 'Test Gym', currency: 'PKR' }))
      .toBe('Hi Today, your Test Gym fee of Rs 3,500 is due today (10 Jun 2026).')
  })
})
