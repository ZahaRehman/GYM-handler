import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

export const isCloudinaryConfigured = () => env.VITE_CLOUDINARY_CLOUD_NAME !== ''

/** Face-cropped square thumbnail URL for a stored public_id. */
export function memberPhotoUrl(publicId: string | null | undefined, size = 96): string | undefined {
  if (!publicId || !isCloudinaryConfigured()) return undefined
  const px = Math.round(size * 2) // retina
  return `https://res.cloudinary.com/${env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_face,w_${px},h_${px},f_auto,q_auto/${publicId}`
}

/** Downscale to max 800px and re-encode as JPEG ~80% (typically 50–150 KB). */
export async function compressImage(file: File, maxSize = 800, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/jpeg', quality),
  )
}

type SignResponse = { signature: string; timestamp: number; folder: string; apiKey: string; cloudName: string }

/** Signed direct upload. The API secret stays in the `cloudinary-sign` edge function. */
export async function uploadMemberPhoto(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const blob = await compressImage(file)
  const { data, error } = await supabase.functions.invoke<SignResponse>('cloudinary-sign', { method: 'POST' })
  if (error || !data) throw new Error(error?.message ?? 'Could not prepare upload')

  const form = new FormData()
  form.append('file', blob, 'photo.jpg')
  form.append('api_key', data.apiKey)
  form.append('timestamp', String(data.timestamp))
  form.append('folder', data.folder)
  form.append('signature', data.signature)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      const res = JSON.parse(xhr.responseText || '{}')
      if (xhr.status >= 200 && xhr.status < 300 && res.public_id) resolve(res.public_id as string)
      else reject(new Error(res?.error?.message ?? 'Upload failed'))
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(form)
  })
}

/** Best effort: a leftover image in Cloudinary is harmless, so failures are only logged. */
export async function deleteMemberPhoto(publicId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('cloudinary-delete', { method: 'POST', body: { publicId } })
  if (error) console.warn('Photo delete failed', error)
}
