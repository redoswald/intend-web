import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectShare, ProjectShareLink, SharePermission } from '@/types'

// Fetch all shares for a project (with joined profile data)
export function useProjectShares(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-shares', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('project_shares')
        .select('*, user:profiles!shared_with_user_id(*)')
        .eq('project_id', projectId)

      if (error) throw error
      return data as ProjectShare[]
    },
    enabled: !!projectId,
  })
}

// Update a share's permission level
export function useUpdateSharePermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      shareId,
      permission,
    }: {
      shareId: string
      projectId: string
      permission: SharePermission
    }) => {
      const { data, error } = await supabase
        .from('project_shares')
        .update({ permission })
        .eq('id', shareId)
        .select()
        .single()

      if (error) throw error
      return data as ProjectShare
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-shares', variables.projectId] })
    },
  })
}

// Remove a share
export function useRemoveShare() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shareId }: { shareId: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_shares')
        .delete()
        .eq('id', shareId)

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-shares', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// Create a share link with chosen permission
export function useCreateShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      permission,
      expiresAt,
    }: {
      projectId: string
      permission: SharePermission
      expiresAt?: string | null
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('project_share_links')
        .insert({
          project_id: projectId,
          created_by: user.id,
          permission,
          expires_at: expiresAt ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return data as ProjectShareLink
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-share-links', variables.projectId] })
    },
  })
}

// List active share links for a project
export function useProjectShareLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-share-links', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('project_share_links')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ProjectShareLink[]
    },
    enabled: !!projectId,
  })
}

// Revoke a share link
export function useRevokeShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ linkId }: { linkId: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_share_links')
        .update({ is_active: false })
        .eq('id', linkId)

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-share-links', variables.projectId] })
    },
  })
}

// Accept a share link by token
export function useAcceptShareLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const { data, error } = await supabase.rpc('accept_share_link', {
        token_input: token,
      })

      if (error) throw error
      return data as string // project_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

