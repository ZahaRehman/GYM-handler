import { MessageCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataCard } from '@/features/data/components/DataCard'
import { useGymToday } from '@/features/members/hooks'
import { PlansCard } from '@/features/plans/components/PlansCard'
import { GymProfileCard } from '../components/GymProfileCard'
import { MessagesCard } from '../components/MessagesCard'
import { RemindersCard } from '../components/RemindersCard'

export function SettingsPage() {
  const { today } = useGymToday()
  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <GymProfileCard />
        <PlansCard />
        <RemindersCard />
        <MessagesCard />
        <DataCard today={today} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="size-4" /> WhatsApp sending</CardTitle>
            <CardDescription>
              <b>Manual (free)</b>: reminders are prepared automatically and you send each one with a single tap from <i>Dues</i>.
              Fully automatic sending through the official WhatsApp Cloud API (small per-message fee from Meta) can be added later.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    </>
  )
}
