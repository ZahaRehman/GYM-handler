// Returns a short-lived signature so the browser can upload a member photo
// straight to Cloudinary without ever seeing the API secret.
import { isAdminRequest } from '../_shared/auth.ts'
import { cloudinaryConfig, MEMBER_PHOTO_FOLDER, signParams } from '../_shared/cloudinary.ts'
import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!(await isAdminRequest(req))) return json({ error: 'Not authorized' }, 401)

  const config = cloudinaryConfig()
  if (!config) return json({ error: 'Cloudinary is not configured on the server' }, 503)

  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder: MEMBER_PHOTO_FOLDER, timestamp }
  const signature = await signParams(params, config.apiSecret)

  return json({ ...params, signature, apiKey: config.apiKey, cloudName: config.cloudName })
})
