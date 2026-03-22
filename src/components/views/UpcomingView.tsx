import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { MainPanel } from '@/components/layout/MainPanel'
import { TaskList } from '@/components/tasks/TaskList'
import { TaskEditor } from '@/components/tasks/TaskEditor'
import { useTasks } from '@/hooks/useTasks'
import type { Task } from '@/types'

export function UpcomingView() {
  const { data: tasks = [], isLoading } = useTasks({ upcoming: true })
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {}

    tasks.forEach((task) => {
      if (!task.due_date) return
      const dateKey = task.due_date
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(task)
    })

    // Sort by date
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [tasks])

  return (
    <MainPanel title="Upcoming">
      <div className="max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-500" />
          </div>
        ) : groupedTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No upcoming tasks scheduled
          </div>
        ) : (
          <div className="space-y-6">
            {groupedTasks.map(([dateKey, dateTasks]) => (
              <section key={dateKey}>
                <h2 className="text-sm font-semibold text-gray-600 mb-2">
                  {format(parseISO(dateKey), 'EEEE, MMMM d')}
                </h2>
                <TaskList
                  tasks={dateTasks}
                  showProject
                  onTaskClick={(task) => setEditingTask(task)}
                />
              </section>
            ))}
          </div>
        )}

        {editingTask && (
          <div className="mt-4">
            <TaskEditor
              task={editingTask}
              onClose={() => setEditingTask(null)}
            />
          </div>
        )}

        {!showAddTask ? (
          <button
            onClick={() => setShowAddTask(true)}
            className="mt-4 flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-accent-600 transition-colors"
          >
            <PlusIcon />
            <span>Add task</span>
          </button>
        ) : (
          <div className="mt-4">
            <TaskEditor
              onClose={() => setShowAddTask(false)}
            />
          </div>
        )}
      </div>
    </MainPanel>
  )
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}
