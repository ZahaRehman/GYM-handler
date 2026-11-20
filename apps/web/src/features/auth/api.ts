import { supabase } from '@/lib/supabase'

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
  if (error) throw error
}

/** RLS only lets a user read their own admins row, so a row means "is admin". */
export async function fetchAdminProfile(userId: string) {
  const { data, error } = await supabase
    .from('admins')
    .select('user_id, full_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}
