import { isValid, parse as parseDate, format } from 'date-fns'
import type { MemberInsert } from '@/features/members/schema'
import { normalizePhone } from '@/features/members/utils'

/** Columns in the downloadable template, in order. Name, phone and monthly fee are required. */
export const TEMPLATE_HEADERS = ['full_name', 'phone', 'fee', 'join_date', 'next_due_date', 'gender', 'address', 'notes'] as const

export const TEMPLATE_EXAMPLE = ['Ali Raza', '0300 1234567', '3000', '2026-01-15', '2026-12-15', 'male', 'Model Town, Lahore', 'Trains evenings']

// Accept common header spellings from existing spreadsheets.
const ALIASES: Record<string, (typeof TEMPLATE_HEADERS)[number]> = {
  name: 'full_name', full_name: 'full_name', fullname: 'full_name', member: 'full_name', member_name: 'full_name',
  phone: 'phone', mobile: 'phone', whatsapp: 'phone', contact: 'phone', phone_number: 'phone', number: 'phone',
  fee: 'fee', fees: 'fee', amount: 'fee', monthly_fee: 'fee',
  join_date: 'join_date', joined: 'join_date', joining_date: 'join_date', start_date: 'join_date', date_joined: 'join_date',
  next_due_date: 'next_due_date', due_date: 'next_due_date', due: 'next_due_date', next_due: 'next_due_date',
  gender: 'gender', sex: 'gender',
  address: 'address',
  notes: 'notes', note: 'notes', remarks: 'notes',
}

export function normalizeHeader(h: string): (typeof TEMPLATE_HEADERS)[number] | null {
  const key = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return ALIASES[key] ?? null
}

const DATE_FORMATS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'd/M/yyyy', 'dd-MM-yyyy', 'd-M-yyyy', 'dd.MM.yyyy', 'd MMM yyyy', 'dd MMM yyyy']

/** Parse a date written in any common format. Day comes before month (Pakistan style), never US M/D/Y. */
export function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  for (const f of DATE_FORMATS) {
    const d = parseDate(s, f, new Date(2000, 0, 1))
    if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2100) return format(d, 'yyyy-MM-dd')
  }
  return null
}

export type ImportRow = {
  line: number
  name: string
  payload: Omit<MemberInsert, 'status'> | null
  errors: string[]
  warnings: string[]
}

export function validateRows(
  records: Record<string, string>[],
  ctx: { existingPhones: Set<string>; today: string },
): ImportRow[] {
  const seen = new Set<string>()
  return records.map((rec, i) => {
    const get = (k: (typeof TEMPLATE_HEADERS)[number]) => (rec[k] ?? '').trim()
    const errors: string[] = []
    const warnings: string[] = []
    const name = get('full_name')
    if (name.length < 2) errors.push('Name is missing')

    const phone = normalizePhone(get('phone'))
    if (!get('phone')) errors.push('Phone is missing')
    else if (!phone) errors.push(`Phone "${get('phone')}" is not a valid number`)
    else if (ctx.existingPhones.has(phone)) errors.push('A member with this phone already exists')
    else if (seen.has(phone)) errors.push('Same phone appears twice in the file')
    if (phone) seen.add(phone)

    let fee = NaN
    if (!get('fee')) errors.push('Fee is missing')
    else {
      fee = Number(get('fee').replace(/[^0-9.]/g, ''))
      if (!Number.isFinite(fee) || fee < 0) errors.push(`Fee "${get('fee')}" is not a number`)
    }

    let join = ctx.today
    if (get('join_date')) {
      const d = parseFlexibleDate(get('join_date'))
      if (d) join = d
      else errors.push(`Join date "${get('join_date')}" not understood (use 2026-01-31 or 31/01/2026)`)
    }

    let due = ctx.today
    if (get('next_due_date')) {
      const d = parseFlexibleDate(get('next_due_date'))
      if (d) due = d
      else errors.push(`Due date "${get('next_due_date')}" not understood`)
    } else {
      warnings.push('No due date: will be due today')
    }
    if (due < join) errors.push('Due date is before join date')

    const g = get('gender').toLowerCase()
    const gender = g.startsWith('m') ? 'male' : g.startsWith('f') ? 'female' : g ? 'other' : null

    const payload = errors.length ? null : {
      full_name: name,
      phone: phone!,
      fee_amount: fee,
      join_date: join,
      next_due_date: due,
      gender: gender as MemberInsert['gender'],
      address: get('address') || null,
      notes: get('notes') || null,
    }
    return { line: i + 2, name: name || '(no name)', payload, errors, warnings }
  })
}
