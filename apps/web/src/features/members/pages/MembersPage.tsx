import { ChevronLeft, ChevronRight, Plus, Search, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PAGE_SIZE } from '../api'
import { DueBadge } from '../components/DueBadge'
import { MemberAvatar } from '../components/MemberAvatar'
import { useGymToday, useMembers } from '../hooks'
import { memberFilterLabels, memberFilters, memberSorts, type MemberFilter, type MemberSort } from '../schema'
import { formatPhone, getDueInfo } from '../utils'

const sortLabels: Record<MemberSort, string> = { due: 'Due date', name: 'Name', newest: 'Newest' }

export function MembersPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filter = (memberFilters as readonly string[]).includes(params.get('filter') ?? '') ? (params.get('filter') as MemberFilter) : 'all'
  const sort = (memberSorts as readonly string[]).includes(params.get('sort') ?? '') ? (params.get('sort') as MemberSort) : 'due'
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const [debounced, setDebounced] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if ((params.get('q') ?? '') !== debounced) update({ q: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const { today, upcomingWindowDays, currency } = useGymToday()
  const { data, isPending, isFetching, isError, error } = useMembers({ search: debounced, filter, sort, page })
  const members = data?.members ?? []
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const due = (m: (typeof members)[number]) => getDueInfo(m.next_due_date, today, m.status, upcomingWindowDays)

  return (
    <>
      <PageHeader
        title="Members"
        description={isPending ? 'Loading…' : `${total} ${filter === 'all' ? 'current' : memberFilterLabels[filter].toLowerCase()} member${total === 1 ? '' : 's'}`}
        actions={<Button className="h-10" render={<Link to="/members/new" />}><Plus /> Add member</Button>}
      />

      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or member #"
              className="h-10 bg-background pl-9" aria-label="Search members" />
          </div>
          <NativeSelect value={sort} onChange={(e) => update({ sort: e.target.value === 'due' ? null : e.target.value })}
            className="[&_select]:h-10 [&_select]:bg-background" aria-label="Sort by">
            {memberSorts.map((s) => <NativeSelectOption key={s} value={s}>{sortLabels[s]}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="tablist" aria-label="Filter by status">
          {memberFilters.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => update({ filter: f === 'all' ? null : f })}
              className={cn('h-8 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors',
                filter === f ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}>
              {memberFilterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <EmptyState icon={Users} title="Could not load members" description={error.message} />
      ) : isPending ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : members.length === 0 ? (
        debounced || filter !== 'all' ? (
          <EmptyState icon={Search} title="No members match" description="Try a different search or filter."
            action={<Button variant="outline" onClick={() => { setSearch(''); setParams({}, { replace: true }) }}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={Users} title="No members yet" description="Add your first member to start tracking fees."
            action={<Button render={<Link to="/members/new" />}><Plus /> Add member</Button>} />
        )
      ) : (
        <div className={cn('transition-opacity', isFetching && 'opacity-70')}>
          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {members.map((m) => (
              <li key={m.id}>
                <Link to={`/members/${m.id}`} className="flex items-center gap-3 rounded-xl border bg-background p-3 active:bg-muted">
                  <MemberAvatar name={m.full_name} photoId={m.photo_public_id} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      #{m.member_code} · {formatMoney(m.fee_amount, currency)} · due {formatDate(m.next_due_date)}
                    </div>
                  </div>
                  <DueBadge info={due(m)} />
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Member</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Next due</TableHead>
                  <TableHead className="pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/members/${m.id}`)}>
                    <TableCell className="pl-4">
                      <Link to={`/members/${m.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <MemberAvatar name={m.full_name} photoId={m.photo_public_id} size={36} />
                        <span>
                          <span className="block font-medium">{m.full_name}</span>
                          <span className="block text-xs text-muted-foreground">#{m.member_code}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatPhone(m.phone)}</TableCell>
                    <TableCell>{m.plan?.name ?? <span className="text-muted-foreground">No plan</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(m.fee_amount, currency)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(m.next_due_date)}</TableCell>
                    <TableCell className="pr-4"><DueBadge info={due(m)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>Page {page + 1} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => update({ page: String(page - 1) })}><ChevronLeft /> Prev</Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => update({ page: String(page + 1) })}>Next <ChevronRight /></Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
