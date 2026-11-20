import { formatDate, formatMoney } from '@/lib/format'
import { renderTemplate } from '@/lib/template'
import { toWaLink } from '@/features/members/utils'

const FALLBACK = 'Thank you {name}! Received {currency} {amount} on {paid_on}. Next due date: {due_date}. - {gym}'

/** wa.me link with the receipt message from Settings, ready for the owner to send. */
export function receiptLink(opts: {
  template?: string
  gym: string
  currency: string
  member: { full_name: string; phone: string; member_code: number }
  amount: number
  paidOn: string
  nextDue: string
}) {
  const text = renderTemplate(opts.template ?? FALLBACK, {
    name: opts.member.full_name.split(' ')[0],
    gym: opts.gym,
    currency: opts.currency === 'PKR' ? 'Rs' : opts.currency,
    amount: formatMoney(opts.amount, opts.currency).replace(/^\S+\s/, ''),
    paid_on: formatDate(opts.paidOn),
    due_date: formatDate(opts.nextDue),
    member_code: opts.member.member_code,
  })
  return toWaLink(opts.member.phone, text)
}
