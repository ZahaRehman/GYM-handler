import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queryKeys'
import { fetchSettings, updateSettings, type SettingsUpdate } from './api'

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings.all, queryFn: fetchSettings, staleTime: 5 * 60_000 })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: SettingsUpdate) => updateSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.settings.all, data)
      qc.invalidateQueries({ queryKey: queryKeys.members.all })
      toast.success('Settings saved')
    },
    onError: (e) => toast.error(e.message),
  })
}
