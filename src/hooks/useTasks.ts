import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getNextOccurrence } from '@/lib/recurrenceHelper'
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/types'

// Supabase self-referential joins may return an array instead of a single object
function normalizeBlockingTask(rows: Record<string, unknown>[]): Task[] {
  return rows.map(row => {
    const bt = row.blocking_task
    if (Array.isArray(bt)) row.blocking_task = bt[0] ?? null
    return row as unknown as Task
  })
}

export interface CompleteTaskResult {
  completed: Task
  nextTask: Task | null
}

interface UseTasksOptions {
  projectId?: string | null
  sectionId?: string | null
  inbox?: boolean
  today?: boolean
  upcoming?: boolean
  noSection?: boolean // Tasks in project but not in any section
}

export function useTasks(options: UseTasksOptions = {}) {
  const { projectId, sectionId, inbox, today, upcoming, noSection } = options

  return useQuery({
    queryKey: ['tasks', options],
    queryFn: async () => {
      // Fetch all open tasks (both parents and children)
      let query = supabase
        .from('tasks')
        .select('*, project:projects(id, name, color), blocking_task:tasks!blocked_by(id, title)')
        .eq('status', 'open')
        .order('sort_order')

      if (inbox) {
        query = query.is('project_id', null)
      } else if (sectionId) {
        query = query.eq('section_id', sectionId)
      } else if (projectId && noSection) {
        query = query.eq('project_id', projectId).is('section_id', null)
      } else if (projectId) {
        query = query.eq('project_id', projectId)
      } else if (today) {
        const todayStr = new Date().toISOString().split('T')[0]
        query = query.lte('due_date', todayStr)
      } else if (upcoming) {
        const todayStr = new Date().toISOString().split('T')[0]
        const twoWeeks = new Date()
        twoWeeks.setDate(twoWeeks.getDate() + 14)
        const twoWeeksStr = twoWeeks.toISOString().split('T')[0]
        query = query.gt('due_date', todayStr).lte('due_date', twoWeeksStr)
      }

      const { data, error } = await query

      if (error) throw error

      const allTasks = normalizeBlockingTask(data as Record<string, unknown>[])

      // Build a map of task ID -> task
      const taskMap = new Map<string, Task>()
      for (const task of allTasks) {
        taskMap.set(task.id, { ...task, subtasks: [] })
      }

      // Attach subtasks to their parents
      const topLevelTasks: Task[] = []
      for (const task of allTasks) {
        const taskWithSubtasks = taskMap.get(task.id)!
        if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
          // This is a subtask - add to parent's subtasks array
          const parent = taskMap.get(task.parent_task_id)!
          parent.subtasks = parent.subtasks || []
          parent.subtasks.push(taskWithSubtasks)
        } else if (!task.parent_task_id) {
          // This is a top-level task
          topLevelTasks.push(taskWithSubtasks)
        }
      }

      return topLevelTasks
    },
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('tasks')
        .select('*, subtasks:tasks(*), project:projects(id, name, color), blocking_task:tasks!blocked_by(id, title)')
        .eq('id', id)
        .single()

      if (error) throw error
      return normalizeBlockingTask([data as Record<string, unknown>])[0]
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          owner_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', data.id] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskOrId: Task | string): Promise<CompleteTaskResult> => {
      // Resolve the full task if given just an ID
      let task: Task
      if (typeof taskOrId === 'string') {
        const { data: fetched, error: fetchErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskOrId)
          .single()
        if (fetchErr) throw fetchErr
        task = fetched as Task
      } else {
        task = taskOrId
      }

      // Mark done
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .select()
        .single()

      if (error) throw error
      const completed = data as Task

      // Spawn next occurrence if recurring
      let nextTask: Task | null = null
      if (task.recurrence_rule) {
        const dueDateUtcNoon = task.due_date ? new Date(task.due_date + 'T12:00:00Z') : new Date()
        const todayUtcNoon = new Date(new Date().toISOString().split('T')[0] + 'T12:00:00Z')
        const afterDate = dueDateUtcNoon > todayUtcNoon ? dueDateUtcNoon : todayUtcNoon
        const nextDate = getNextOccurrence(task.recurrence_rule, afterDate)

        if (nextDate) {
          const nextDueDate = nextDate.toISOString().split('T')[0]
          const { data: newTask, error: createErr } = await supabase
            .from('tasks')
            .insert({
              owner_id: task.owner_id,
              title: task.title,
              description: task.description,
              project_id: task.project_id,
              section_id: task.section_id,
              parent_task_id: task.parent_task_id,
              priority: task.priority,
              due_date: nextDueDate,
              due_time: task.due_time,
              recurrence_rule: task.recurrence_rule,
              recurrence_base_date: task.recurrence_base_date,
              sort_order: task.sort_order,
            })
            .select()
            .single()

          if (createErr) throw createErr
          nextTask = newTask as Task
        }
      }

      return { completed, nextTask }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUncompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'open',
          completed_at: null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// All tasks for a project (open + done), used by Archive view
export function useAllProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'all', projectId],
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id, name, color), blocking_task:tasks!blocked_by(id, title)')
        .eq('project_id', projectId)
        .order('status')
        .order('sort_order')

      if (error) throw error
      return normalizeBlockingTask(data as Record<string, unknown>[])
    },
    enabled: !!projectId,
  })
}

// Completed tasks for history view
export function useCompletedTasks(limit: number = 100) {
  return useQuery({
    queryKey: ['tasks', 'completed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, project:projects(id, name, color), blocking_task:tasks!blocked_by(id, title)')
        .eq('status', 'done')
        .order('completed_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return normalizeBlockingTask(data as Record<string, unknown>[])
    },
  })
}

// Task count hooks for sidebar badges
export function useInboxCount() {
  return useQuery({
    queryKey: ['tasks', 'inbox', 'count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .is('project_id', null)

      if (error) throw error
      return count ?? 0
    },
  })
}

export function useSearchTasks(query: string) {
  return useQuery({
    queryKey: ['tasks', 'search', query],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, project_id, project:projects(id, name, color)')
        .eq('status', 'open')
        .ilike('title', `%${query}%`)
        .limit(8)

      if (error) throw error
      return data as unknown as Pick<Task, 'id' | 'title' | 'due_date' | 'project_id' | 'project'>[]
    },
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
  })
}

export function useTodayCount() {
  return useQuery({
    queryKey: ['tasks', 'today', 'count'],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0]
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .lte('due_date', todayStr)

      if (error) throw error
      return count ?? 0
    },
  })
}

// --- Task reorder (drag-and-drop) ---

export interface TaskReorderUpdate {
  id: string
  sort_order: number
  parent_task_id?: string | null
}

/**
 * Compute sort_order updates to insert `draggedId` near `targetId`
 * in the given zone ('above' | 'below'), under `newParentId`.
 */
export function computeTaskReorder(
  tasks: Task[],
  draggedId: string,
  targetId: string,
  zone: 'above' | 'below',
  newParentTaskId: string | null,
): TaskReorderUpdate[] {
  const siblings = tasks
    .filter(t => t.parent_task_id === newParentTaskId && t.id !== draggedId)
    .sort((a, b) => a.sort_order - b.sort_order)

  const targetIndex = siblings.findIndex(t => t.id === targetId)
  const insertIndex = zone === 'above' ? targetIndex : targetIndex + 1

  const dragged = tasks.find(t => t.id === draggedId)
  if (!dragged) return []

  const newOrder = [...siblings]
  newOrder.splice(insertIndex < 0 ? newOrder.length : insertIndex, 0, dragged)

  const updates: TaskReorderUpdate[] = []
  newOrder.forEach((t, i) => {
    const isDragged = t.id === draggedId
    const sortChanged = t.sort_order !== i
    const parentChanged = isDragged && t.parent_task_id !== newParentTaskId

    if (sortChanged || parentChanged) {
      const update: TaskReorderUpdate = { id: t.id, sort_order: i }
      if (isDragged) update.parent_task_id = newParentTaskId
      updates.push(update)
    }
  })

  return updates
}

export function useReorderTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: TaskReorderUpdate[]) => {
      const results = await Promise.all(
        updates.map(({ id, sort_order, parent_task_id }) => {
          const patch: Record<string, unknown> = { sort_order }
          if (parent_task_id !== undefined) patch.parent_task_id = parent_task_id
          return supabase
            .from('tasks')
            .update(patch)
            .eq('id', id)
        }),
      )
      const firstError = results.find(r => r.error)
      if (firstError?.error) throw firstError.error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
