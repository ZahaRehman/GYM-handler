import { Camera, ImageUp, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { isCloudinaryConfigured, memberPhotoUrl, uploadMemberPhoto } from '@/lib/cloudinary'
import { initials } from '@/lib/format'

const MAX_BYTES = 15 * 1024 * 1024

export function PhotoUpload({ value, onChange, name }: { value: string | null; onChange: (publicId: string | null) => void; name: string }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const configured = isCloudinaryConfigured()

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image')
    if (file.size > MAX_BYTES) return toast.error('Image is too large (max 15 MB)')
    setPreview(URL.createObjectURL(file))
    setProgress(0)
    try {
      onChange(await uploadMemberPhoto(file, setProgress))
    } catch (e) {
      setPreview(null)
      toast.error(`Photo upload failed: ${(e as Error).message}`)
    } finally {
      setProgress(null)
    }
  }

  const src = preview ?? memberPhotoUrl(value, 112)
  const uploading = progress !== null

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-muted text-2xl font-semibold text-muted-foreground">
        {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name) || <Camera className="size-8" />}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-xs text-white">
            <Loader2 className="mb-1 size-5 animate-spin" /> {progress}%
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        {configured ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={uploading} onClick={() => cameraRef.current?.click()}>
                <Camera /> Take photo
              </Button>
              <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <ImageUp /> Upload
              </Button>
              {(value || preview) && !uploading && (
                <Button type="button" variant="ghost" onClick={() => { setPreview(null); onChange(null) }} aria-label="Remove photo">
                  <Trash2 />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Face is centred automatically. Photos are compressed before upload.</p>
          </>
        ) : (
          <p className="max-w-xs text-sm text-muted-foreground">
            Photo upload turns on once Cloudinary is connected (set <code className="text-xs break-all">VITE_CLOUDINARY_CLOUD_NAME</code>).
          </p>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden"
          onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>
    </div>
  )
}
