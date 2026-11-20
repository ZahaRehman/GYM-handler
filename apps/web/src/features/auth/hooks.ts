import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { fetchAdminProfile, signIn, signOut } from './api'
import { useAuth } from './AuthProvider'

export function useAdminProfile() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: queryKeys.auth.admin(userId ?? 'anon'),
    queryFn: () => fetchAdminProfile(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  })
}

export function useSignIn() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => signIn(email, password),
  })
}

export function useSignOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => qc.clear(),
  })
}
