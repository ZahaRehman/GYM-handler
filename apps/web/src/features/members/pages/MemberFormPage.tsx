import { ArrowLeft, UserX } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { MemberForm } from '../components/MemberForm'
import { useGymToday, useMember, useRegisterMember, useUpdateMember } from '../hooks'
import { toFormValues, toMemberPayload, type MemberFormValues } from '../schema'

export function MemberFormPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { today, currency } = useGymToday()
  const member = useMember(id)
  const create = useRegisterMember()
  const update = useUpdateMember()

  const back = (
    <Button variant="ghost" size="sm" render={<Link to={isNew ? '/members' : `/members/${id}`} />}>
      <ArrowLeft /> Back
    </Button>
  )

  if (!isNew && member.isPending) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>
  }
  if (!isNew && !member.data) {
    return <EmptyState icon={UserX} title="Member not found" action={<Button render={<Link to="/members" />}>Back to members</Button>} />
  }

  const defaults: MemberFormValues = member.data
    ? toFormValues(member.data)
    : {
        full_name: '', phone: '', gender: '', fee_amount: Number.NaN,
        join_date: today, next_due_date: today, notes: '', photo_public_id: null,
        collect_payment: true, payment_method: 'cash', admission_fee: Number.NaN,
      }

  const onSubmit = (values: MemberFormValues) => {
    if (isNew) {
      create.mutate({ values, planMonths: 1 }, {
        onSuccess: ({ member: m, warnings }) => {
          toast.success(`${m.full_name} added (#${m.member_code})`, {
            action: { label: 'Add another', onClick: () => navigate('/members/new') },
          })
          if (warnings.length) toast.warning(`Member saved, but the ${warnings.join(' and the ')}. Record it from their profile.`, { duration: 15000 })
          navigate(`/members/${m.id}`, { replace: true })
        },
      })
    } else {
      update.mutate({ id: id!, payload: toMemberPayload(values), previousPhotoId: member.data?.photo_public_id }, {
        onSuccess: () => {
          toast.success('Changes saved')
          navigate(`/members/${id}`, { replace: true })
        },
      })
    }
  }

  return (
    <>
      <div className="-mt-2 mb-2">{back}</div>
      <PageHeader title={isNew ? 'Add member' : `Edit ${member.data?.full_name}`} description={isNew ? 'Register a new gym member' : `Member #${member.data?.member_code}`} />
      <MemberForm
        key={id ?? 'new'}
        defaultValues={defaults}
        isNew={isNew}
        currency={currency}
        submitting={create.isPending || update.isPending}
        onSubmit={onSubmit}
        onCancel={() => navigate(isNew ? '/members' : `/members/${id}`)}
      />
    </>
  )
}
