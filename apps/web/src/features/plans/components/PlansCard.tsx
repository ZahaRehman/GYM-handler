import { MoreVertical, Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useSettings } from '@/features/settings/hooks'
import { formatMoney } from '@/lib/format'
import { countMembersOnPlan } from '../api'
import { useDeletePlan, usePlans, useTogglePlan } from '../hooks'
import { durationLabel, type Plan } from '../schema'
import { PlanDialog } from './PlanDialog'

export function PlansCard() {
  const { data: plans, isPending } = usePlans()
  const { data: settings } = useSettings()
  const toggle = useTogglePlan()
  const del = useDeletePlan()
  const [editing, setEditing] = useState<Plan | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<{ plan: Plan; members: number } | null>(null)

  const openNew = () => { setEditing(null); setDialogOpen(true) }
  const openEdit = (p: Plan) => { setEditing(p); setDialogOpen(true) }
  const askDelete = async (p: Plan) => {
    try {
      setToDelete({ plan: p, members: await countMembersOnPlan(p.id) })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membership plans</CardTitle>
        <CardDescription>Plans set the default fee and how far each payment moves the due date.</CardDescription>
        <CardAction>
          <Button size="sm" onClick={openNew}><Plus /> Add plan</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : !plans?.length ? (
          <EmptyState icon={Tags} title="No plans yet" description="Add your first plan, e.g. Monthly." action={<Button onClick={openNew}><Plus /> Add plan</Button>} />
        ) : (
          <ul className="divide-y rounded-lg border">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {!p.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {formatMoney(p.price, settings?.currency)} · {durationLabel(p.duration_months)}
                  </div>
                </div>
                <Switch checked={p.is_active} aria-label={`${p.name} active`}
                  onCheckedChange={(v) => toggle.mutate({ id: p.id, is_active: v })} />
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${p.name}`} />}>
                    <MoreVertical />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => openEdit(p)}><Pencil /> Edit</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => askDelete(p)}><Trash2 /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <PlanDialog open={dialogOpen} onOpenChange={setDialogOpen} plan={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete "${toDelete?.plan.name}"?`}
        description={toDelete?.members
          ? `${toDelete.members} member(s) are on this plan. They keep their fee and due date but will show "No plan". Consider turning the plan off instead.`
          : 'This cannot be undone.'}
        confirmLabel="Delete plan"
        destructive
        onConfirm={() => { if (toDelete) del.mutate(toDelete.plan.id); setToDelete(null) }}
      />
    </Card>
  )
}
