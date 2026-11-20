// Deletes a member photo from Cloudinary. Only public_ids inside the member folder are allowed.
import { isAdminRequest } from '../_shared/auth.ts'
import { cloudinaryConfig, MEMBER_PHOTO_FOLDER, signParams } from '../_shared/cloudinary.ts'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!(await isAdminRequest(req))) return json({ error: 'Not authorized' }, 401)

  const config = cloudinaryConfig()
  if (!config) return json({ error: 'Cloudinary is not configured on the server' }, 503)

  const body = await req.json().catch(() => null)
  const publicId = typeof body?.publicId === 'string' ? body.publicId : ''
  if (!publicId.startsWith(`${MEMBER_PHOTO_FOLDER}/`) || publicId.includes('..')) {
    return json({ error: 'Invalid publicId' }, 400)
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const signature = await signParams({ public_id: publicId, timestamp }, config.apiSecret)
  const form = new FormData()
  form.set('public_id', publicId)
  form.set('timestamp', String(timestamp))
  form.set('api_key', config.apiKey)
  form.set('signature', signature)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: 'POST',
    body: form,
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) return json({ error: result?.error?.message ?? 'Cloudinary delete failed' }, 502)

  // "not found" is fine: the photo is already gone.
  return json({ result: result.result ?? 'ok' })
})
