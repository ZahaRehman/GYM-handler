import { Download, FileUp, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { methodLabels, typeLabels } from '@/features/payments/schema'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatPhone } from '@/features/members/utils'
import { exportAllMembers, exportAllPayments } from '../api'

export function DataCard({ today }: { today: string }) {
  const [busy, setBusy] = useState<'members' | 'payments' | null>(null)

  const run = async (kind: 'members' | 'payments') => {
    setBusy(kind)
    try {
      if (kind === 'members') {
        const rows = await exportAllMembers()
        downloadCsv(`members_${today}.csv`, toCsv(
          ['Member #', 'Name', 'Phone', 'Status', 'Monthly fee', 'Join date', 'Next due date', 'Gender', 'Notes'],
          rows.map((m) => [m.member_code, m.full_name, formatPhone(m.phone), m.status, m.fee_amount, m.join_date, m.next_due_date, m.gender, m.notes]),
        ))
      } else {
        const rows = await exportAllPayments()
        downloadCsv(`payments_all_${today}.csv`, toCsv(
          ['Date paid', 'Member #', 'Member', 'Amount', 'Type', 'Method', 'Period start', 'Period end', 'Note'],
          rows.map((p) => [p.paid_on, p.member?.member_code, p.member?.full_name, p.amount, typeLabels[p.type], methodLabels[p.method], p.period_start, p.period_end, p.note]),
        ))
      }
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>Bring in an existing register, or download everything as spreadsheets (opens in Excel). Keep a copy now and then.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link to="/members/import" />}><FileUp /> Import members from CSV</Button>
        <Button variant="outline" onClick={() => run('members')} disabled={!!busy}>
          {busy === 'members' ? <Loader2 className="animate-spin" /> : <Download />} All members
        </Button>
        <Button variant="outline" onClick={() => run('payments')} disabled={!!busy}>
          {busy === 'payments' ? <Loader2 className="animate-spin" /> : <Download />} All payments
        </Button>
      </CardContent>
    </Card>
  )
}
