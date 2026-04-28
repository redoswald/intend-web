import { useState } from 'react'
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns'
import { CheckCheck } from 'lucide-react'
import { MainPanel } from '@/components/layout/MainPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { useCompletedTasks, useUpdateTask, useUncompleteTask } from '@/hooks/useTasks'
import type { Task } from '@/types'

export function CompletedView() {
  const { data: tasks = [], isLoading } = useCompletedTasks(200)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  // Group tasks by completion date
  const grouped = groupByCompletionDate(tasks)

  return (
    <MainPanel title="Completed">
      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckCheck}
            title="No completed tasks yet"
            description="Tasks you finish will collect here, grouped by date — a record of what you've gotten done."
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(({ label, tasks }) => (
              <div key={label}>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {label}
                </h3>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <CompletedTaskItem
                      key={task.id}
                      task={task}
                      isEditing={editingTaskId === task.id}
                      onEditClick={() => setEditingTaskId(task.id)}
                      onEditClose={() => setEditingTaskId(null)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainPanel>
  )
}

interface CompletedTaskItemProps {
  task: Task
  isEditing: boolean
  onEditClick: () => void
  onEditClose: () => void
}

function CompletedTaskItem({ task, isEditing, onEditClick, onEditClose }: CompletedTaskItemProps) {
  const updateTask = useUpdateTask()
  const uncompleteTask = useUncompleteTask()
  const [completedDate, setCompletedDate] = useState(
    task.completed_at ? task.completed_at.split('T')[0] : ''
  )

  const completedAt = task.completed_at ? parseISO(task.completed_at) : null

  async function handleUncomplete() {
    await uncompleteTask.mutateAsync(task.id)
  }

  async function handleSaveDate() {
    if (!completedDate) return

    // Preserve the time portion or default to noon
    const existingTime = task.completed_at?.split('T')[1] || '12:00:00.000Z'
    const newCompletedAt = `${completedDate}T${existingTime}`

    await updateTask.mutateAsync({
      id: task.id,
      completed_at: newCompletedAt,
    })
    onEditClose()
  }

  return (
    <div className="px-4 py-3 group">
      <div className="flex items-start gap-3">
        {/* Completed checkmark */}
        <button
          onClick={handleUncomplete}
          className="mt-0.5 w-5 h-5 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center hover:bg-accent-500 transition-colors"
          title="Mark as incomplete"
        >
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <span className="text-gray-500 line-through">{task.title}</span>

          {task.project && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: task.project.color }}
              />
              <span className="text-xs text-gray-400">{task.project.name}</span>
            </div>
          )}
        </div>

        {/* Completion date */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
              autoFocus
            />
            <button
              onClick={handleSaveDate}
              disabled={updateTask.isPending}
              className="text-xs px-2 py-1 bg-accent-500 text-white rounded hover:bg-accent-600 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={onEditClose}
              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onEditClick}
            className="text-xs text-gray-400 hover:text-accent-600 transition-colors"
            title="Edit completion date"
          >
            {completedAt ? formatCompletedTime(completedAt) : 'No date'}
          </button>
        )}
      </div>
    </div>
  )
}

function groupByCompletionDate(tasks: Task[]): { label: string; tasks: Task[] }[] {
  const groups: Record<string, Task[]> = {}

  for (const task of tasks) {
    const label = task.completed_at
      ? getDateGroupLabel(parseISO(task.completed_at))
      : 'Unknown'

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(task)
  }

  // Define order for labels
  const labelOrder = ['Today', 'Yesterday', 'Earlier this week', 'Last week', 'Earlier this month', 'Last month']

  // Sort groups by predefined order, then by date for "Month Year" groups
  const sortedLabels = Object.keys(groups).sort((a, b) => {
    const aIndex = labelOrder.indexOf(a)
    const bIndex = labelOrder.indexOf(b)

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1

    // Both are custom month labels - sort reverse chronologically
    return b.localeCompare(a)
  })

  return sortedLabels.map((label) => ({ label, tasks: groups[label] }))
}

function getDateGroupLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date)) return 'Earlier this week'

  const now = new Date()
  const lastWeekStart = new Date(now)
  lastWeekStart.setDate(now.getDate() - 7 - now.getDay())
  const lastWeekEnd = new Date(lastWeekStart)
  lastWeekEnd.setDate(lastWeekStart.getDate() + 7)

  if (date >= lastWeekStart && date < lastWeekEnd) return 'Last week'

  if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
    return 'Earlier this month'
  }

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  if (date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear()) {
    return 'Last month'
  }

  // For older dates, group by month
  if (isThisYear(date)) {
    return format(date, 'MMMM')
  }

  return format(date, 'MMMM yyyy')
}

function formatCompletedTime(date: Date): string {
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`
  if (isThisYear(date)) return format(date, 'MMM d')
  return format(date, 'MMM d, yyyy')
}
