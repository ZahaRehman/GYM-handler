import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { memberPhotoUrl } from '@/lib/cloudinary'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MemberAvatar({ name, photoId, size = 40, className }: { name: string; photoId: string | null; size?: number; className?: string }) {
  return (
    <Avatar className={cn('shrink-0', className)} style={{ width: size, height: size }}>
      <AvatarImage src={memberPhotoUrl(photoId, size)} alt={name} />
      <AvatarFallback style={{ fontSize: Math.max(12, size / 3) }}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
