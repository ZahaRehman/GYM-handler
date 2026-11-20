import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'

export function NotFound() {
  return (
    <EmptyState icon={SearchX} title="Page not found" description="That page doesn't exist."
      action={<Button render={<Link to="/" />}>Go to dashboard</Button>} />
  )
}
