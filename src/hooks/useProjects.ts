import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order')

      if (error) throw error
      return data as Project[]
    },
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          sections(
            *,
            tasks(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Project & { sections: Array<{ id: string; name: string; tasks: unknown[] }> }
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...input,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProjectInput & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project', data.id] })
    },
  })
}

export function useArchivedProjects() {
  return useQuery({
    queryKey: ['archived-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('is_archived', true)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as Project[]
    },
  })
}

export function useArchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ is_archived: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['archived-projects'] })
    },
  })
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ is_archived: false })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['archived-projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

// Helper to get all descendant IDs of a project (for cycle prevention)
export function getDescendantIds(projects: Project[], projectId: string): Set<string> {
  const descendants = new Set<string>()
  function collect(parentId: string) {
    for (const p of projects) {
      if (p.parent_id === parentId && !descendants.has(p.id)) {
        descendants.add(p.id)
        collect(p.id)
      }
    }
  }
  collect(projectId)
  return descendants
}

// Helper to build hierarchical tree from flat list
export function buildProjectTree(projects: Project[]): Project[] {
  const map = new Map<string, Project>()
  const roots: Project[] = []

  // First pass: create map
  projects.forEach(p => {
    map.set(p.id, { ...p, children: [] })
  })

  // Second pass: build tree
  projects.forEach(p => {
    const project = map.get(p.id)!
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.children!.push(project)
    } else {
      roots.push(project)
    }
  })

  // Sort children by sort_order at every level
  function sortChildren(nodes: Project[]) {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    nodes.forEach(n => {
      if (n.children && n.children.length > 0) sortChildren(n.children)
    })
  }
  sortChildren(roots)

  return roots
}

export interface ReorderUpdate {
  id: string
  sort_order: number
  parent_id?: string | null
}

/**
 * Compute the sort_order updates needed to insert `draggedId` near `targetId`
 * in the given zone ('above' | 'below'), under `newParentId`.
 */
export function computeReorder(
  projects: Project[],
  draggedId: string,
  targetId: string,
  zone: 'above' | 'below',
  newParentId: string | null,
): ReorderUpdate[] {
  // Get siblings in the destination parent, excluding the dragged project
  const siblings = projects
    .filter(p => p.parent_id === newParentId && p.id !== draggedId)
    .sort((a, b) => a.sort_order - b.sort_order)

  const targetIndex = siblings.findIndex(p => p.id === targetId)
  const insertIndex = zone === 'above' ? targetIndex : targetIndex + 1

  // Build the new ordered list with the dragged project inserted
  const newOrder = [...siblings]
  const dragged = projects.find(p => p.id === draggedId)
  if (!dragged) return []
  newOrder.splice(insertIndex < 0 ? newOrder.length : insertIndex, 0, dragged)

  // Produce updates — only items whose sort_order actually changed
  const updates: ReorderUpdate[] = []
  newOrder.forEach((p, i) => {
    const newSortOrder = i
    const isTheDragged = p.id === draggedId
    const sortChanged = p.sort_order !== newSortOrder
    const parentChanged = isTheDragged && p.parent_id !== newParentId

    if (sortChanged || parentChanged) {
      const update: ReorderUpdate = { id: p.id, sort_order: newSortOrder }
      if (isTheDragged) update.parent_id = newParentId
      updates.push(update)
    }
  })

  return updates
}

export function useReorderProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: ReorderUpdate[]) => {
      const results = await Promise.all(
        updates.map(({ id, sort_order, parent_id }) => {
          const patch: Record<string, unknown> = { sort_order }
          if (parent_id !== undefined) patch.parent_id = parent_id
          return supabase
            .from('projects')
            .update(patch)
            .eq('id', id)
        }),
      )
      const firstError = results.find(r => r.error)
      if (firstError?.error) throw firstError.error
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previous = queryClient.getQueryData<Project[]>(['projects'])

      queryClient.setQueryData<Project[]>(['projects'], (old) => {
        if (!old) return old
        return old.map(p => {
          const upd = updates.find(u => u.id === p.id)
          if (!upd) return p
          return {
            ...p,
            sort_order: upd.sort_order,
            ...(upd.parent_id !== undefined ? { parent_id: upd.parent_id } : {}),
          }
        })
      })

      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['projects'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
