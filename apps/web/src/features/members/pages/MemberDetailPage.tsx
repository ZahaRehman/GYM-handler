import { ArrowLeft, CalendarClock, LogOut, MessageCircle, MoreVertical, Pause, Pencil, Phone, Play, Trash2, UserX, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PaymentHistory } from '@/features/payments/components/PaymentHistory'
import { RecordPaymentDialog } from '@/features/payments/components/RecordPaymentDialog'
import { MemberReminders } from '@/features/reminders/components/MemberReminders'
import { kindForDays, renderMemberMessage, templateFor } from '@/features/reminders/message'
import { useSettings } from '@/features/settings/hooks'
import { formatDate, formatMoney } from '@/lib/format'
import { DueBadge } from '../components/DueBadge'
import { MemberAvatar } from '../components/MemberAvatar'
import { useDeleteMember, useGymToday, useMember, useSetMemberStatus } from '../hooks'
import type { MemberStatus } from '../schema'
import { formatPhone, getDueInfo, toWaLink } from '../utils'

const genderLabel = { male: 'Male', female: 'Female', other: 'Other' } as const

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children || <span className="font-normal text-muted-foreground">—</span>}</dd>
    </div>
  )
}

export function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: m, isPending } = useMember(id)
  const { today, upcomingWindowDays, currency } = useGymToday()
  const { data: settings } = useSettings()
  const setStatus = useSetMemberStatus()
  const del = useDeleteMember()
  const [statusConfirm, setStatusConfirm] = useState<MemberStatus | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [payOpen, setPayOpen] = useState(false)

  if (isPending) return <div className="space-y-4"><Skeleton className="h-28 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
  if (!m) return <EmptyState icon={UserX} title="Member not found" description="They may have been deleted." action={<Button render={<Link to="/members" />}>Back to members</Button>} />

  const due = getDueInfo(m.next_due_date, today, m.status, upcomingWindowDays)
  // WhatsApp button pre-writes a reminder when the fee is due soon / today / overdue.
  const waText = settings && m.status === 'active' && ['due_soon', 'due_today', 'overdue'].includes(due.status)
    ? renderMemberMessage(templateFor(kindForDays(due.days), settings), m, settings) : undefined
  const daysText = m.status !== 'active' ? '' : due.days > 0 ? `in ${due.days} day${due.days === 1 ? '' : 's'}` : due.days === 0 ? 'today' : `${-due.days} day${due.days === -1 ? '' : 's'} ago`

  const statusCopy: Record<MemberStatus, { title: string; description: string; label: string }> = {
    paused: { title: 'Pause membership?', description: 'Paused members get no reminders and are not counted as overdue. You can resume any time.', label: 'Pause' },
    left: { title: 'Mark as left?', description: 'They move to the "Left" list and stop getting reminders. Payment history is kept.', label: 'Mark as left' },
    active: { title: 'Re-activate membership?', description: 'Reminders start again based on their next due date. Update the due date if needed.', label: 'Re-activate' },
  }

  return (
    <>
      <div className="-mt-2 mb-2">
        <Button variant="ghost" size="sm" render={<Link to="/members" />}><ArrowLeft /> Members</Button>
      </div>

      <Card className="relative mb-4">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <MemberAvatar name={m.full_name} photoId={m.photo_public_id} size={88} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{m.full_name}</h1>
              <DueBadge info={due} />
            </div>
            <p className="text-sm text-muted-foreground">Member #{m.member_code} · {formatPhone(m.phone)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => setPayOpen(true)}><Wallet /> Record payment</Button>
              <Button variant="outline" render={<a href={toWaLink(m.phone, waText)} target="_blank" rel="noreferrer" />}><MessageCircle /> {waText ? 'Send reminder' : 'WhatsApp'}</Button>
              <Button variant="outline" render={<a href={`tel:${m.phone}`} />}><Phone /> Call</Button>
            </div>
          </div>
          <div className="absolute top-4 right-4 sm:static sm:self-center">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}><MoreVertical /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(`/members/${m.id}/edit`)}><Pencil /> Edit details</DropdownMenuItem>
                {m.status === 'active' && <DropdownMenuItem onClick={() => setStatusConfirm('paused')}><Pause /> Pause membership</DropdownMenuItem>}
                {m.status !== 'active' && <DropdownMenuItem onClick={() => setStatusConfirm('active')}><Play /> Re-activate</DropdownMenuItem>}
                {m.status !== 'left' && <DropdownMenuItem onClick={() => setStatusConfirm('left')}><LogOut /> Mark as left</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => { setDeleteText(''); setDeleteOpen(true) }}><Trash2 /> Delete member</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card size="sm"><CardContent>
          <p className="text-xs text-muted-foreground">Fee</p>
          <p className="mt-1 font-semibold tabular-nums">{formatMoney(m.fee_amount, currency)}</p>
          <p className="text-xs text-muted-foreground">per month</p>
        </CardContent></Card>
        <Card size="sm"><CardContent>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="size-3.5" /> Next due date</p>
          <p className="mt-1 font-semibold">{formatDate(m.next_due_date)}</p>
          <p className={due.status === 'overdue' ? 'text-xs font-medium text-red-600' : 'text-xs text-muted-foreground'}>{daysText || '—'}</p>
        </CardContent></Card>
        <Card size="sm"><CardContent>
          <p className="text-xs text-muted-foreground">Member since</p>
          <p className="mt-1 font-semibold">{formatDate(m.join_date)}</p>
          <p className="text-xs text-muted-foreground capitalize">{m.status}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-3 grid gap-4 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Personal</CardTitle></CardHeader><CardContent><dl className="divide-y">
            <Detail label="Phone">{formatPhone(m.phone)}</Detail>
            <Detail label="Gender">{m.gender ? genderLabel[m.gender] : null}</Detail>
          </dl></CardContent></Card>
          <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{m.notes || 'No notes.'}</p>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="payments" className="mt-3">
          <PaymentHistory memberId={m.id} currency={currency} onRecord={() => setPayOpen(true)} />
        </TabsContent>
        <TabsContent value="reminders" className="mt-3">
          <MemberReminders memberId={m.id} />
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog member={m} open={payOpen} onOpenChange={setPayOpen} />

      {statusConfirm && (
        <ConfirmDialog open onOpenChange={(o) => !o && setStatusConfirm(null)}
          title={statusCopy[statusConfirm].title} description={statusCopy[statusConfirm].description}
          confirmLabel={statusCopy[statusConfirm].label} destructive={statusConfirm === 'left'}
          onConfirm={() => { setStatus.mutate({ id: m.id, status: statusConfirm }); setStatusConfirm(null) }} />
      )}

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} destructive confirmLabel="Delete forever"
        title={`Delete ${m.full_name}?`}
        description={<>This permanently deletes the member, their photo and all their payment history. To keep history, use <b>Mark as left</b> instead. Type the member's name to confirm.</>}
        confirmDisabled={deleteText.trim().toLowerCase() !== m.full_name.trim().toLowerCase() || del.isPending}
        onConfirm={() => del.mutate(m, { onSuccess: () => { setDeleteOpen(false); navigate('/members', { replace: true }) } })}>
        <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={m.full_name} aria-label="Type member name to confirm" />
      </ConfirmDialog>
    </>
  )
}
