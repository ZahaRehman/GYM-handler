import { createClient } from 'npm:@supabase/supabase-js@2'

/** Returns true only when the caller's JWT belongs to a row in public.admins. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data, error } = await supabase.rpc('is_admin')
  return !error && data === true
}
